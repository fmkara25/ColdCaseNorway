"""CI-only check of built-container routing and saves across stack recreation.

Uses a dedicated Compose project with synthetic data; never run against real saves.
The cookie file contains an anonymous save capability and must remain CI-temporary.
"""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["write", "read"])
parser.add_argument("cookie_file", type=Path)
args = parser.parse_args()
base = "http://127.0.0.1:8080"
path = "/api/cases/1999-1218/investigation"
jar = http.cookiejar.MozillaCookieJar(str(args.cookie_file))
if args.cookie_file.exists():
    jar.load(ignore_discard=True, ignore_expires=True)
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(route, method="GET", body=None):
    headers = {"X-ColdCase-Request": "1"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(base + route, method=method, headers=headers,
                                 data=None if body is None else json.dumps(body).encode())
    return client.open(req, timeout=15)


if args.mode == "write":
    with request("/api/cases") as response:
        assert any(case["id"] == "1999-1218" for case in json.load(response))
    with request("/cases/1999-1218/people/ingrid") as response:
        assert "text/html" in response.headers["Content-Type"]
        assert b'lang="nb"' in response.read()
    for route in ["/api/not-a-real-endpoint", "/images/not-a-real-image.webp"]:
        try:
            request(route)
            raise AssertionError("Missing resource must not receive the SPA index")
        except urllib.error.HTTPError as error:
            assert error.code == 404
            if route.startswith("/api/"):
                assert "text/html" not in error.headers.get("Content-Type", "")
    with request(path, "POST") as response:
        snapshot = json.load(response)
        cookie = response.headers["Set-Cookie"].lower()
        assert "httponly" in cookie and "samesite=strict" in cookie
    snapshot["board"]["notes"] = [{"id": "container-check", "text": "Container restart persistence"}]
    with request(path + "/board", "PUT", snapshot) as response:
        assert json.load(response)["version"] == snapshot["version"] + 1
    args.cookie_file.parent.mkdir(parents=True, exist_ok=True)
    args.cookie_file.touch(mode=0o600, exist_ok=True)
    os.chmod(args.cookie_file, 0o600)
    jar.save(ignore_discard=True, ignore_expires=True)
else:
    assert args.cookie_file.exists(), "The write phase must run before restarting the stack"
    with request(path) as response:
        snapshot = json.load(response)
        assert snapshot["board"]["notes"] == [{"id": "container-check", "text": "Container restart persistence"}]
        assert snapshot["version"] == 1
print("Container routing/save check passed:", args.mode)
