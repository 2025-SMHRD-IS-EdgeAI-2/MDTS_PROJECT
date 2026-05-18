#!/usr/bin/env python3
"""Start the MDTS Raspberry Pi sensor server and Jetson PyQt5 app for trauma capture.

This helper is called by the local Node API when the web dashboard requests
trauma capture but the Jetson PyQt5 control API is not reachable yet.
"""

from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Any

try:
    import paramiko
except Exception as exc:  # pragma: no cover - runtime dependency check
    print(json.dumps({"ok": False, "reason": "paramiko_unavailable", "detail": str(exc)}, ensure_ascii=False))
    sys.exit(2)


@dataclass(frozen=True)
class SshConfig:
    host: str
    user: str
    password: str
    port: int = 22


PI = SshConfig(
    host=os.getenv("MDTS_PI_HOST", "YOUR_RPI_HOST"),
    user=os.getenv("MDTS_PI_USER", "pi"),
    password=os.getenv("MDTS_PI_PASSWORD", "YOUR_RPI_PASSWORD"),
)
JETSON = SshConfig(
    host=os.getenv("MDTS_JETSON_DIRECT_HOST", "YOUR_JETSON_HOST"),
    user=os.getenv("MDTS_JETSON_USER", "jetson"),
    password=os.getenv("MDTS_JETSON_PASSWORD", "YOUR_JETSON_PASSWORD"),
)


def connect(config: SshConfig, sock: Any | None = None) -> paramiko.SSHClient:
    """Create an SSH connection."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=config.host,
        port=config.port,
        username=config.user,
        password=config.password,
        sock=sock,
        timeout=8,
        banner_timeout=8,
        auth_timeout=8,
        look_for_keys=False,
        allow_agent=False,
    )
    return client


def run(client: paramiko.SSHClient, command: str, timeout: int = 12) -> tuple[int, str, str]:
    """Run a remote shell command and return exit code, stdout, stderr."""
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    del stdin
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def start_pi_sensor_server(pi: paramiko.SSHClient) -> dict[str, Any]:
    """Ensure Raspberry Pi sensor server is running."""
    command = (
        "bash -lc \""
        "if pgrep -f '^python3 -u /home/pi/sensor_server_rpi.py' >/dev/null; then "
        "  echo sensor_server_already_running; "
        "else "
        "  cd /home/pi && setsid -f python3 -u /home/pi/sensor_server_rpi.py "
        "  > /home/pi/sensor.log 2>&1 < /dev/null && echo sensor_server_started; "
        "fi"
        "\""
    )
    code, out, err = run(pi, command, timeout=10)
    return {"exit_code": code, "stdout": out.strip(), "stderr": err.strip()}


def start_jetson_pyqt5(pi: paramiko.SSHClient) -> dict[str, Any]:
    """Ensure Jetson PyQt5 app is running through the Pi direct LAN jump."""
    transport = pi.get_transport()
    if transport is None:
        raise RuntimeError("pi_ssh_transport_unavailable")

    channel = transport.open_channel("direct-tcpip", (JETSON.host, JETSON.port), ("127.0.0.1", 0))
    jetson = connect(JETSON, sock=channel)
    try:
        command = (
            "bash -lc \""
            "if pgrep -f '^python3 -u /home/jetson/main.py' >/dev/null; then "
            "  echo pyqt5_already_running; "
            "else "
            "  cd /home/jetson && export DISPLAY=:0 && export XAUTHORITY=/home/jetson/.Xauthority && "
            "  setsid -f python3 -u /home/jetson/main.py > /home/jetson/pyqt5.log 2>&1 < /dev/null && "
            "  echo pyqt5_started; "
            "fi"
            "\""
        )
        code, out, err = run(jetson, command, timeout=10)
        return {"exit_code": code, "stdout": out.strip(), "stderr": err.strip()}
    finally:
        jetson.close()


def main() -> int:
    """Start the remote trauma stack and print a machine-readable result."""
    result: dict[str, Any] = {"ok": False, "pi": None, "jetson": None}
    pi = connect(PI)
    try:
        result["pi"] = start_pi_sensor_server(pi)
        result["jetson"] = start_jetson_pyqt5(pi)
        time.sleep(1.5)
        result["ok"] = True
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        result["reason"] = "remote_start_failed"
        result["detail"] = str(exc)
        print(json.dumps(result, ensure_ascii=False))
        return 1
    finally:
        pi.close()


if __name__ == "__main__":
    raise SystemExit(main())
