from __future__ import annotations

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import paramiko


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
LOG_DIR = WORKSPACE_ROOT / "tunnel_logs"
DEFAULT_CLOUDFLARED = WORKSPACE_ROOT / "tools" / "cloudflared.exe"


@dataclass(frozen=True)
class SshConfig:
    host: str
    user: str
    password: str
    port: int = 22


@dataclass(frozen=True)
class RecoveryConfig:
    pi: SshConfig
    jetson: SshConfig
    cloudflared: Path
    vercel_project: str
    vercel_domain: str


def env(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def build_config() -> RecoveryConfig:
    return RecoveryConfig(
        pi=SshConfig(
            host=env("MDTS_PI_HOST", "YOUR_RPI_HOST"),
            user=env("MDTS_PI_USER", "pi"),
            password=env("MDTS_PI_PASSWORD", "YOUR_RPI_PASSWORD"),
        ),
        jetson=SshConfig(
            host=env("MDTS_JETSON_HOST", "YOUR_JETSON_HOST"),
            user=env("MDTS_JETSON_USER", "jetson"),
            password=env("MDTS_JETSON_PASSWORD", "YOUR_JETSON_PASSWORD"),
        ),
        cloudflared=Path(env("MDTS_CLOUDFLARED", str(DEFAULT_CLOUDFLARED))),
        vercel_project=env("MDTS_VERCEL_PROJECT", "frontend_aibackend"),
        vercel_domain=env("MDTS_VERCEL_DOMAIN", "https://frontendaibackend.vercel.app"),
    )


def log(message: str) -> None:
    print(message, flush=True)


class Spinner:
    def __init__(self, message: str, interval: float = 0.2) -> None:
        self.message = message
        self.interval = interval
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def __enter__(self) -> "Spinner":
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.stop()

    def _run(self) -> None:
        frames = ["|", "/", "-", "\\"]
        index = 0
        while not self._stop.is_set():
            frame = frames[index % len(frames)]
            sys.stdout.write(f"\r  {frame} {self.message}")
            sys.stdout.flush()
            index += 1
            time.sleep(self.interval)

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=1)
        sys.stdout.write("\r" + " " * (len(self.message) + 8) + "\r")
        sys.stdout.flush()


def run_local(
    args: list[str],
    *,
    cwd: Path = ROOT,
    timeout: int = 60,
    check: bool = False,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(cwd),
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=check,
    )


def run_powershell(script: str, *, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    return run_local(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ],
        timeout=timeout,
    )


def port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


def http_get(url: str, timeout: int = 8) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return 200 <= response.status < 300, body
    except Exception as error:
        return False, str(error)


def connect_ssh(config: SshConfig) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=config.host,
        port=config.port,
        username=config.user,
        password=config.password,
        timeout=12,
        banner_timeout=12,
        auth_timeout=12,
        look_for_keys=False,
        allow_agent=False,
    )
    return client


def ssh_exec(config: SshConfig, command: str, *, timeout: int = 80) -> tuple[int, str, str]:
    with connect_ssh(config) as client:
        _, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=False)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        code = stdout.channel.recv_exit_status()
        return code, out, err


def stop_processes_by_patterns(patterns: Iterable[str]) -> None:
    escaped = ",".join(json.dumps(pattern) for pattern in patterns)
    script = f"""
$patterns = @({escaped})
Get-CimInstance Win32_Process | Where-Object {{
  $cmd = $_.CommandLine
  if (-not $cmd) {{ return $false }}
  foreach ($pattern in $patterns) {{
    if ($cmd -like $pattern) {{ return $true }}
  }}
  return $false
}} | ForEach-Object {{
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}}
"""
    run_powershell(script, timeout=30)


def start_hidden(
    args: list[str],
    *,
    cwd: Path,
    stdout_path: Path,
    stderr_path: Path,
) -> subprocess.Popen[bytes]:
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    stderr_path.parent.mkdir(parents=True, exist_ok=True)
    stdout = stdout_path.open("wb")
    stderr = stderr_path.open("wb")
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    return subprocess.Popen(
        args,
        cwd=str(cwd),
        stdout=stdout,
        stderr=stderr,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
    )


def restart_pi(config: RecoveryConfig) -> None:
    log("[1/8] Raspberry Pi sensor/MariaDB 확인")
    command = r"""
set -u
printf 'YOUR_RPI_PASSWORD\n' | sudo -S systemctl restart mdts-sensor.service >/tmp/mdts_sensor_restart.log 2>&1 || true
sleep 3
printf '[IP]\n'
ip -4 addr show | awk '/inet / {print $2, $NF}'
printf '\n[SERVICE]\n'
systemctl is-active mdts-sensor.service || true
printf '\n[PORTS]\n'
ss -ltnp 2>/dev/null | grep -E ':5000|:3306' || true
printf '\n[VITALS]\n'
curl -s --max-time 3 http://127.0.0.1:5000/vitals || true
"""
    code, out, err = ssh_exec(config.pi, command, timeout=80)
    if code != 0:
        raise RuntimeError(f"Pi restart failed: {err or out}")
    if "active" not in out or ":5000" not in out or ":3306" not in out:
        raise RuntimeError(f"Pi service/port check failed:\n{out}\n{err}")
    log("  OK: Pi Sensor API 5000, MariaDB 3306")


def restart_jetson(config: RecoveryConfig) -> None:
    log("[2/8] Jetson PyQt5/Ollama 확인")
    command = r"""
set -u
sudo -n systemctl start ollama >/tmp/mdts_ollama_start.log 2>&1 || true
PORT_PIDS=$(ss -ltnp 'sport = :5055' 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u | tr '\n' ' ')
if [ -n "${PORT_PIDS}" ]; then
  kill ${PORT_PIDS} >/dev/null 2>&1 || true
  sleep 1
fi
cd /home/jetson/mdts
nohup bash /home/jetson/mdts/start_pyqt5.sh > /home/jetson/mdts/pyqt5.log 2>&1 < /dev/null &
sleep 8
printf '[IP]\n'
ip -4 addr show | awk '/inet / {print $2, $NF}'
printf '\n[PYQT]\n'
ss -ltnp 2>/dev/null | grep ':5055' || true
curl -s --max-time 3 http://127.0.0.1:5055/health || true
printf '\n\n[OLLAMA]\n'
ss -ltnp 2>/dev/null | grep ':11434' || true
curl -s --max-time 5 http://127.0.0.1:11434/api/tags | head -c 300 || true
printf '\n\n[MEMORY]\n'
free -m
"""
    code, out, err = ssh_exec(config.jetson, command, timeout=100)
    if code != 0:
        raise RuntimeError(f"Jetson restart failed: {err or out}")
    if ":5055" not in out or '"ok": true' not in out:
        raise RuntimeError(f"Jetson PyQt5 check failed:\n{out}\n{err}")
    if ":11434" not in out or "models" not in out:
        raise RuntimeError(f"Jetson Ollama check failed:\n{out}\n{err}")
    log("  OK: Jetson PyQt5 5055, Ollama localhost 11434")


def restart_windows_services() -> None:
    log("[3/8] Windows Node API/FastAPI/Vite 정렬")
    stop_processes_by_patterns(
        [
            "*node.exe*server/index.js*",
            "*node server/index.js*",
            "*server/index.js*",
            "*uvicorn*ai_backend.m_medic_server*",
            "*jetson_ollama_tunnel.py*",
        ]
    )
    time.sleep(2)

    start_hidden(
        ["node", "server/index.js"],
        cwd=ROOT,
        stdout_path=ROOT / "server.log",
        stderr_path=ROOT / "server.err.log",
    )

    start_hidden(
        [sys.executable, "-m", "uvicorn", "ai_backend.m_medic_server:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=ROOT,
        stdout_path=ROOT / "fastapi.log",
        stderr_path=ROOT / "fastapi.err.log",
    )

    if not port_open("127.0.0.1", 5173, timeout=0.5):
        start_hidden(
            ["cmd", "/c", "npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
            cwd=ROOT,
            stdout_path=ROOT / "vite.log",
            stderr_path=ROOT / "vite.err.log",
        )

    deadline = time.time() + 45
    while time.time() < deadline:
        if port_open("127.0.0.1", 4000) and port_open("127.0.0.1", 8000):
            break
        time.sleep(1)

    if not port_open("127.0.0.1", 4000):
        raise RuntimeError("Windows Node API 4000 did not start")
    if not port_open("127.0.0.1", 8000):
        raise RuntimeError("FastAPI 8000 did not start")
    log("  OK: Node API 4000, FastAPI 8000")


def restart_ollama_tunnel() -> None:
    log("[4/8] Windows localhost:11434 -> Jetson Ollama 터널 재시작")
    stop_processes_by_patterns(["*jetson_ollama_tunnel.py*"])
    time.sleep(2)
    start_hidden(
        [sys.executable, "tools/jetson_ollama_tunnel.py"],
        cwd=ROOT,
        stdout_path=ROOT / "jetson_ollama_tunnel_out.log",
        stderr_path=ROOT / "jetson_ollama_tunnel_err.log",
    )
    deadline = time.time() + 30
    while time.time() < deadline:
        ok, body = http_get("http://127.0.0.1:11434/api/tags", timeout=5)
        if ok and "models" in body:
            log("  OK: localhost:11434 Ollama tunnel")
            return
        time.sleep(1)
    raise RuntimeError("Ollama tunnel 11434 did not become healthy")


def restart_cloudflare_tunnels(config: RecoveryConfig) -> tuple[str, str]:
    log("[5/8] Cloudflare HTTPS 터널 재생성")
    if not config.cloudflared.exists():
        raise FileNotFoundError(f"cloudflared not found: {config.cloudflared}")

    stop_processes_by_patterns(
        [
            "*cloudflared.exe*tunnel --url http://127.0.0.1:4000*",
            "*cloudflared.exe*tunnel --url http://127.0.0.1:8000*",
        ]
    )
    time.sleep(3)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    node_err = LOG_DIR / "node_4000_cloudflared.err.log"
    node_out = LOG_DIR / "node_4000_cloudflared.out.log"
    fast_err = LOG_DIR / "fastapi_8000_cloudflared.err.log"
    fast_out = LOG_DIR / "fastapi_8000_cloudflared.out.log"
    for path in (node_err, node_out, fast_err, fast_out):
        try:
            path.unlink()
        except FileNotFoundError:
            pass

    start_hidden(
        [str(config.cloudflared), "tunnel", "--url", "http://127.0.0.1:4000", "--protocol", "http2", "--no-autoupdate"],
        cwd=ROOT,
        stdout_path=node_out,
        stderr_path=node_err,
    )
    start_hidden(
        [str(config.cloudflared), "tunnel", "--url", "http://127.0.0.1:8000", "--protocol", "http2", "--no-autoupdate"],
        cwd=ROOT,
        stdout_path=fast_out,
        stderr_path=fast_err,
    )

    node_url = wait_for_tunnel_url(node_err, node_out, "Node API")
    fastapi_url = wait_for_tunnel_url(fast_err, fast_out, "FastAPI")

    assert_http_ok(f"{node_url}/api/crew", "Node tunnel /api/crew")
    assert_http_ok(f"{fastapi_url}/health", "FastAPI tunnel /health")

    log(f"  OK: Node tunnel {node_url}")
    log(f"  OK: FastAPI tunnel {fastapi_url}")
    return node_url, fastapi_url


def wait_for_tunnel_url(err_log: Path, out_log: Path, label: str) -> str:
    deadline = time.time() + 45
    pattern = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
    last_text = ""
    while time.time() < deadline:
        text = ""
        for path in (err_log, out_log):
            if path.exists():
                text += "\n" + path.read_text(encoding="utf-8", errors="replace")
        last_text = text
        match = pattern.search(text)
        if match:
            return match.group(0)
        time.sleep(1)
    raise RuntimeError(f"{label} tunnel URL not found in logs:\n{last_text[-2000:]}")


def assert_http_ok(url: str, label: str) -> None:
    deadline = time.time() + 35
    last = ""
    while time.time() < deadline:
        ok, body = http_get(url, timeout=12)
        if ok:
            return
        last = body
        time.sleep(2)
    raise RuntimeError(f"{label} failed: {last}")


def update_vercel(node_url: str, fastapi_url: str, config: RecoveryConfig) -> None:
    log("[6/8] Vercel 프로덕션 재배포")
    node_api = f"{node_url}/api"
    project_json = ROOT / ".vercel" / "project.json"
    if not project_json.exists():
        raise RuntimeError(
            f"Vercel project link file not found: {project_json}\n"
            f"Run once manually: vercel link --project {config.vercel_project}"
        )
    try:
        linked_project = json.loads(project_json.read_text(encoding="utf-8")).get("projectName")
    except Exception as error:
        raise RuntimeError(f"Invalid Vercel project file: {project_json}: {error}") from error
    if linked_project != config.vercel_project:
        raise RuntimeError(
            f"Wrong Vercel project linked: {linked_project!r}. "
            f"Expected {config.vercel_project!r}. Run: vercel link --project {config.vercel_project}"
        )
    log(f"  OK: Vercel project linked: {linked_project}")
    log("  INFO: Vercel 저장 환경변수는 건드리지 않고 이번 배포에만 새 터널 주소를 직접 주입한다.")
    log(f"  BUILD_ENV VITE_LEGACY_API_BASE={node_api}")
    log(f"  BUILD_ENV VITE_AI_API_BASE={fastapi_url}")

    log("  RUNNING: Vercel production 배포 중. 보통 30초~3분 걸린다.")
    with Spinner("Vercel 빌드/배포 진행 중"):
        deploy = run_local(
            [
                "cmd",
                "/c",
                "vercel",
                "--prod",
                "--yes",
                "--build-env",
                f"VITE_LEGACY_API_BASE={node_api}",
                "--build-env",
                f"VITE_AI_API_BASE={fastapi_url}",
            ],
            cwd=ROOT,
            timeout=360,
        )
    if deploy.returncode != 0:
        raise RuntimeError(f"Vercel deploy failed:\n{deploy.stderr}\n{deploy.stdout}")
    deployment_url = ""
    alias_url = ""
    url_match = re.search(r"https://[^\s]+\.vercel\.app", deploy.stdout + "\n" + deploy.stderr)
    if url_match:
        deployment_url = url_match.group(0)
    alias_match = re.search(r"Aliased:\s+(https://[^\s]+)", deploy.stdout + "\n" + deploy.stderr)
    if alias_match:
        alias_url = alias_match.group(1)
    log("  OK: Vercel production redeployed")
    if deployment_url:
        log(f"  DEPLOYMENT: {deployment_url}")
    if alias_url:
        log(f"  ALIAS: {alias_url}")


def write_runtime_info(node_url: str, fastapi_url: str, config: RecoveryConfig) -> None:
    log("[7/8] 현재 런타임 정보 저장")
    info = {
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "pi": config.pi.host,
        "jetson": config.jetson.host,
        "node_api_tunnel": f"{node_url}/api",
        "fastapi_tunnel": fastapi_url,
        "vercel_domain": config.vercel_domain,
    }
    path = WORKSPACE_ROOT / "MDTS_RUNTIME_STATUS.json"
    path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"  OK: {path}")


def final_check(config: RecoveryConfig) -> None:
    log("[8/8] 최종 연동 확인")
    checks = {
        "local_node_crew": "http://127.0.0.1:4000/api/crew",
        "local_node_sensor": "http://127.0.0.1:4000/api/sensor/live",
        "local_fastapi_health": "http://127.0.0.1:8000/health",
        "local_ollama_tags": "http://127.0.0.1:11434/api/tags",
        "vercel": config.vercel_domain,
    }
    failures: list[str] = []
    for name, url in checks.items():
        ok, body = http_get(url, timeout=15)
        if ok:
            log(f"  OK: {name}")
        else:
            failures.append(f"{name}: {body}")
    if failures:
        raise RuntimeError("Final check failed:\n" + "\n".join(failures))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MDTS reboot/environment one-click recovery")
    parser.add_argument("--skip-vercel", action="store_true", help="Do not update Vercel env/deploy")
    parser.add_argument("--skip-remote", action="store_true", help="Do not restart Pi/Jetson services")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = build_config()
    try:
        if not args.skip_remote:
            restart_pi(config)
            restart_jetson(config)
        restart_windows_services()
        restart_ollama_tunnel()
        node_url, fastapi_url = restart_cloudflare_tunnels(config)
        if not args.skip_vercel:
            update_vercel(node_url, fastapi_url, config)
        write_runtime_info(node_url, fastapi_url, config)
        final_check(config)
    except Exception as error:
        log("")
        log(f"[FAIL] {error}")
        return 1

    log("")
    log("[DONE] MDTS one-click recovery complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
