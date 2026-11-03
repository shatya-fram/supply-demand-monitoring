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

import base64
import gzip
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


ARCHIVE_DIR = "archive/2026-10"        # frozen October close, staged by scripts/stage_period_archive.py (period toggle, per=oct)
PERIOD_FEEDS = ["dse_visits_feed", "sellin_feed", "penjualan_feed", "demand_feed", "dse_kpi_feed", "endbal_feed", "target_feed", "dse_coverage",
                "ga_feed", "ga_site_feed", "kro_feed", "pjp_mapping_feed", "stock_feed"]     # same list as website/period_feeds.js


def period_block(sizes):
    """Replaces <script src="period_feeds.js">: the live feeds stay plain inline scripts that are skipped when the link says per=oct; the October
    feeds are embedded as base64 gzip blobs and unpacked by the synchronous inflate of period_inflate.js before app.js runs."""
    out = ['<script>window.IJ_BUNDLED = 1;</script>',
           '<script data-src="period_feeds.js">\n%s\n</script>' % inline_js(read("period_feeds.js")),
           '<script data-src="period_inflate.js">\n%s\n</script>' % inline_js(read("period_inflate.js"))]
    for name in PERIOD_FEEDS:
        out.append(live_script("data/%s.js" % name, sizes))
        out.append(oct_blob(name, sizes))
    return "\n".join(out)


def live_script(rel, sizes):
    js = inline_js(read(rel))
    sizes.append((rel, len(js)))
    return '<script data-src="%s">\nif (window.IJ_PER !== \'oct\') {\n%s\n}\n</script>' % (rel, js)


def oct_blob(name, sizes):
    raw = read("%s/%s.js" % (ARCHIVE_DIR, name)).encode("utf-8")
    b64 = base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode("ascii")
    sizes.append(("%s/%s.js (gz)" % (ARCHIVE_DIR, name), len(b64)))
    return ('<script type="text/plain" id="ijoct-%s">%s</script>\n'
            '<script>(function () { var e = document.getElementById("ijoct-%s"); if (window.IJ_PER === "oct") (0, eval)(window.ijInflate(e.textContent)); e.parentNode.removeChild(e); })();</script>') % (name, b64, name)


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
        if src == "period_feeds.js":
            return period_block(sizes)
        js = inline_js(read(src))
        sizes.append((src, len(js)))
        return "<script data-src=\"%s\">\n%s\n</script>" % (src, js)

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js_repl, html)
    # data/kro_slim.js (outlets below the KRO slab = Retail) is loaded on demand by app.js through a relative <script src>, which cannot work from
    # a single file or from the portal blob; inline it before app.js so the Retail slabs and counts are filled (it defines window.KRO_SLIM)
    tag = '<script data-src="app.js">'
    assert tag in html, "app.js script tag not found"
    html = html.replace(tag, '%s\n%s\n%s' % (live_script("data/kro_slim.js", sizes), oct_blob("kro_slim", sizes), tag), 1)
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
