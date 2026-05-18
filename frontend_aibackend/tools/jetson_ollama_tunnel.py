"""Local tunnel from Windows localhost:11434 to Jetson Ollama via Raspberry Pi.

The dashboard AI backend runs on Windows and calls http://127.0.0.1:11434.
Jetson is currently reachable only from Raspberry Pi over YOUR_JETSON_HOST, and
Ollama listens on Jetson localhost only. This tunnel preserves the backend
configuration while routing traffic through Pi -> Jetson SSH -> Jetson Ollama.
"""

from __future__ import annotations

import select
import socket
import socketserver
import sys
import threading
from dataclasses import dataclass

import paramiko


@dataclass(frozen=True)
class SshConfig:
    host: str
    username: str
    password: str
    port: int = 22


PI_CONFIG = SshConfig(host="YOUR_RPI_HOST", username="pi", password="YOUR_RPI_PASSWORD")
JETSON_CONFIG = SshConfig(host="YOUR_JETSON_HOST", username="jetson", password="YOUR_JETSON_PASSWORD")
LOCAL_BIND_HOST = "127.0.0.1"
LOCAL_BIND_PORT = 11434
REMOTE_HOST = "127.0.0.1"
REMOTE_PORT = 11434


def connect_client(config: SshConfig, sock: socket.socket | None = None) -> paramiko.SSHClient:
    """Create an SSH client with password authentication."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=config.host,
        port=config.port,
        username=config.username,
        password=config.password,
        sock=sock,
        timeout=15,
        banner_timeout=15,
        auth_timeout=15,
        look_for_keys=False,
        allow_agent=False,
    )
    return client


class ForwardHandler(socketserver.BaseRequestHandler):
    """Forward one local TCP connection through the Jetson SSH transport."""

    jetson_transport: paramiko.Transport

    def handle(self) -> None:
        try:
            channel = self.jetson_transport.open_channel(
                "direct-tcpip",
                (REMOTE_HOST, REMOTE_PORT),
                self.request.getpeername(),
            )
        except Exception as exc:
            print(f"[tunnel] channel open failed: {exc}", flush=True)
            return

        if channel is None:
            print("[tunnel] channel open failed: empty channel", flush=True)
            return

        try:
            while True:
                readable, _, _ = select.select([self.request, channel], [], [], 1.0)
                if self.request in readable:
                    data = self.request.recv(16384)
                    if not data:
                        break
                    channel.sendall(data)
                if channel in readable:
                    data = channel.recv(16384)
                    if not data:
                        break
                    self.request.sendall(data)
        finally:
            channel.close()


class ThreadedServer(socketserver.ThreadingTCPServer):
    """Threaded TCP server with immediate port reuse."""

    allow_reuse_address = True
    daemon_threads = True


def main() -> int:
    """Run the tunnel until the process is terminated."""
    pi_client = connect_client(PI_CONFIG)
    pi_transport = pi_client.get_transport()
    if pi_transport is None:
        raise RuntimeError("Pi SSH transport is not available")

    jump_sock = pi_transport.open_channel(
        "direct-tcpip",
        (JETSON_CONFIG.host, JETSON_CONFIG.port),
        ("127.0.0.1", 0),
    )
    jetson_client = connect_client(JETSON_CONFIG, sock=jump_sock)
    jetson_transport = jetson_client.get_transport()
    if jetson_transport is None:
        raise RuntimeError("Jetson SSH transport is not available")

    ForwardHandler.jetson_transport = jetson_transport
    server = ThreadedServer((LOCAL_BIND_HOST, LOCAL_BIND_PORT), ForwardHandler)
    print(
        f"[tunnel] listening http://{LOCAL_BIND_HOST}:{LOCAL_BIND_PORT} "
        f"-> pi:{PI_CONFIG.host} -> jetson:{JETSON_CONFIG.host} -> "
        f"{REMOTE_HOST}:{REMOTE_PORT}",
        flush=True,
    )

    stop_event = threading.Event()
    try:
        while not stop_event.is_set():
            server.handle_request()
    finally:
        server.server_close()
        jetson_client.close()
        pi_client.close()

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
    except Exception as error:
        print(f"[tunnel] fatal: {error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
