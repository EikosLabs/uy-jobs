#!/usr/bin/env python3
"""Mini proxy HTTP(S) para el tunel de scraping (corre en tu PC).

Requiere solo Python 3 (viene con Windows Store o python.org).
Uso:  python tunnel-proxy.py [puerto]
Escucha en 127.0.0.1 y el VPS lo alcanza por el tunel SSH.
"""

import socket
import threading
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
BUF = 65536


def pipe(a, b):
    try:
        while True:
            d = a.recv(BUF)
            if not d:
                break
            b.sendall(d)
    except OSError:
        pass
    finally:
        for s in (a, b):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            s.close()


def handle(client):
    try:
        req = client.recv(8192).decode("latin1")
        if not req:
            client.close()
            return
        line = req.split("\r\n", 1)[0]
        method, target = line.split()[:2]
        if method.upper() == "CONNECT":
            host, _, port = target.partition(":")
            port = int(port or 443)
            path = None
        else:
            assert target.startswith("http"), "solo http/https"
            rest = target.split("://", 1)[1]
            hostport, _, path = rest.partition("/")
            host, _, port = hostport.partition(":")
            port = int(port or 80)
            path = "/" + path
        remote = socket.create_connection((host, port), timeout=15)
        if method.upper() == "CONNECT":
            client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        else:
            head, _, _ = req.partition("\r\n\r\n")
            lines = head.split("\r\n")
            new = [lines[0].split()[0] + " " + path + " " + lines[0].split()[2]]
            for h in lines[1:]:
                if not h.lower().startswith("proxy-"):
                    new.append(h)
            remote.sendall(("\r\n".join(new) + "\r\n\r\n").encode("latin1"))
        t = threading.Thread(target=pipe, args=(client, remote), daemon=True)
        t.start()
        pipe(remote, client)
    except Exception:
        try:
            client.close()
        except OSError:
            pass


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", PORT))
    srv.listen(50)
    print(f"proxy en 127.0.0.1:{PORT} (deja esta ventana abierta)")
    while True:
        client, _ = srv.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
