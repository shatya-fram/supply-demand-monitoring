#!/usr/bin/env python3
"""
dev_server.py  ·  Static file server for website/ that tells browsers not to cache.

python3 -m http.server lets browsers keep stale copies of styles.css, app.js and the
data feeds (heuristic caching), so a reload can show old CSS or old numbers after a
change. This server sends Cache-Control: no-store on every response. Pure stdlib.

Usage (from the project root): python3 scripts/dev_server.py [port] [directory]
Defaults: port 8088, directory website.
"""

import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
    directory = sys.argv[2] if len(sys.argv) > 2 else "website"
    handler = functools.partial(NoCacheHandler, directory=directory)
    with http.server.ThreadingHTTPServer(("", port), handler) as srv:
        print(f"Serving {directory} on http://localhost:{port} (no-store)")
        srv.serve_forever()


if __name__ == "__main__":
    main()
