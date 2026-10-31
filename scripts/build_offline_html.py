#!/usr/bin/env python3
"""
build_offline_html.py  ·  Bundle the website into one self-contained HTML file.

Reads website/index.html and inlines every local <link rel="stylesheet"> and <script src>
(tokens.css, Leaflet CSS/JS, styles.css, all data/*.js feeds, app.js) so the file opens from
disk by double-click with no server. Online-only parts that remain: Google Fonts (falls back
to Arial) and map tiles (OpenStreetMap / CARTO / Esri).

Output: dist/inner_jakarta_offline_<YYYYMMDD>.html  (and a copy without the date suffix).
Pure stdlib. Run from the project root.
"""

import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "website")
OUT_DIR = os.path.join(ROOT, "dist")


def read(rel):
    with open(os.path.join(WEB, rel), encoding="utf-8") as f:
        return f.read()


def inline_js(src):
    # a literal "</script" inside JS would end the inline block; escape it (valid inside JS strings/regex)
    return src.replace("</script", "<\\/script")


def main():
    html = read("index.html")
    sizes = []

    def css_repl(m):
        href = m.group(1)
        if href.startswith("http"):
            return m.group(0)
        css = read(href)
        sizes.append((href, len(css)))
        return "<style data-src=\"%s\">\n%s\n</style>" % (href, css)

    def js_repl(m):
        src = m.group(1)
        if src.startswith("http"):
            return m.group(0)
        js = inline_js(read(src))
        sizes.append((src, len(js)))
        return "<script data-src=\"%s\">\n%s\n</script>" % (src, js)

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js_repl, html)
    # data/kro_slim.js (outlets below the KRO slab = Retail) is loaded on demand by app.js through a relative <script src>, which cannot work from
    # a single file or from the portal blob; inline it before app.js so the Retail slabs and counts are filled (it defines window.KRO_SLIM)
    slim = read("data/kro_slim.js")
    sizes.append(("data/kro_slim.js", len(slim)))
    tag = '<script data-src="app.js">'
    assert tag in html, "app.js script tag not found"
    html = html.replace(tag, '<script data-src="data/kro_slim.js">\n%s\n</script>\n%s' % (inline_js(slim), tag), 1)
    stamp = date.today().strftime("%Y%m%d")
    banner = ("<!-- Inner Jakarta Supply & Demand Monitoring · offline bundle built %s from website/ at git HEAD. "
              "Open directly in a browser; no server needed. Map tiles and the Archivo font need internet. -->\n" % stamp)
    html = html.replace("<!doctype html>", "<!doctype html>\n" + banner, 1)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "inner_jakarta_offline_%s.html" % stamp)
    latest = os.path.join(OUT_DIR, "inner_jakarta_offline.html")
    for p in (out, latest):
        with open(p, "w", encoding="utf-8") as f:
            f.write(html)
    total = os.path.getsize(out)
    print("Inlined:")
    for name, n in sizes:
        print("  %-32s %8.1f KB" % (name, n / 1024))
    print("Written %s (%.1f MB) and %s" % (out, total / 1024 / 1024, latest))
    return 0


if __name__ == "__main__":
    sys.exit(main())
