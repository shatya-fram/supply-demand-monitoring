#!/usr/bin/env python3
"""
prepare_public_release.py
Builds a sanitized, history-free copy of the project in dist-public/ that is safe to push to a PUBLIC GitHub repository.

Why a separate copy: the working repository history already contains personal contact data (DSE mobile numbers and a
few e-mail addresses), and git history cannot be cleaned by a later commit. The export starts a brand-new git history
with one commit, so nothing from the old history is published.

What it does
  1. copies the tracked project files (website/, data/, scripts/, docs/, README, CLAUDE.md) except the exclusions below
  2. masks personal contact data in every text file: DSE mobile numbers (msisdn / mobo_msisdn columns and any Indonesian
     mobile number that stands alone as a value, e.g. outlets named after a phone number) and e-mail addresses
  3. scans the result and FAILS if a phone number or e-mail address is still present
  4. writes the GitHub Pages workflow (website/ is the published site) and initialises a fresh git repository with one commit

It never contacts GitHub and never stores credentials. Pushing is a manual step (see the printed instructions).

Usage (from the project root): python3 scripts/prepare_public_release.py
"""
import csv, io, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist-public')

INCLUDE_DIRS = ['website', 'data', 'scripts', 'docs']
INCLUDE_FILES = ['CLAUDE.md', '.gitignore']
EXCLUDE_PREFIXES = ('.claude/', '.agents/', 'Brand Guide/', 'dist/', 'raw/')
EXCLUDE_FILES = {'GEMINI.md', 'Performance_Sell_In_GA_Dashboard(2).html'}
TEXT_EXT = ('.json', '.js', '.csv', '.md', '.html', '.py', '.txt', '.yml', '.yaml', '.css')

PHONE_BARE = re.compile(r'(?<![\w.,])(?:\+?62|0)8\d{8,11}(?:\.0)?(?![\w,])')       # Indonesian mobile number as a standalone token (markdown, csv cells)
PHONE_QUOTED = re.compile(r'"(?:\+?62|0)8\d{8,11}(?:\.0)?"')                         # the same, only as a quoted string (json / js / html: bare numbers there are rupiah values)
PHONE_VALUE = PHONE_QUOTED
EMAIL = re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+')
PHONE_COLS = re.compile(r'(msisdn|phone|telepon|hp$)', re.I)
MASK_PHONE, MASK_MAIL = '(nomor disamarkan)', '(email disamarkan)'


def tracked_files():
    out = subprocess.check_output(['git', 'ls-files'], cwd=ROOT).decode('utf-8').split('\n')
    return [f for f in out if f]


def wanted(path):
    if path in EXCLUDE_FILES or path.startswith(EXCLUDE_PREFIXES):
        return False
    return path in INCLUDE_FILES or path.split('/')[0] in INCLUDE_DIRS


def mask_text(s, quoted=True):
    s = EMAIL.sub(MASK_MAIL, s)
    return PHONE_QUOTED.sub('"' + MASK_PHONE + '"', s) if quoted else PHONE_BARE.sub(MASK_PHONE, s)


def mask_csv(raw):
    rows = list(csv.reader(io.StringIO(raw)))
    if not rows:
        return raw
    hdr = rows[0]
    phone_idx = [i for i, h in enumerate(hdr) if PHONE_COLS.search(h or '')]
    mail_idx = [i for i, h in enumerate(hdr) if re.search(r'e-?mail', h or '', re.I)]
    for r in rows[1:]:
        for i in phone_idx:
            if i < len(r) and r[i].strip():
                r[i] = MASK_PHONE
        for i in mail_idx:
            if i < len(r) and r[i].strip():
                r[i] = MASK_MAIL
        for i, c in enumerate(r):
            r[i] = mask_text(c, quoted=False)
    buf = io.StringIO()
    csv.writer(buf, lineterminator='\n').writerows(rows)
    return buf.getvalue()


def mask_json_keys(s):
    """msisdn-style keys carry the number as a plain string; blank them whatever their format."""
    return re.sub(r'("(?:mobo_)?msisdn[^"]*"\s*:\s*)"[^"]*"', r'\1"' + MASK_PHONE + '"', s, flags=re.I)


README = """# Supply & Demand Monitoring · Inner Jakarta

Static monitoring app for Indosat Ooredoo Hutchison, Region Inner Jakarta: Sell-In, DSE visits (PJP), demand, gross add,
END BALANCE, UAR and DSE productivity, from the Region down to Area, Micro Cluster, DSO, DSE and outlet.

* **Live site** (GitHub Pages): enable Pages with source "GitHub Actions"; the workflow in `.github/workflows/pages.yml`
  publishes the `website/` folder.
* **Run locally**: `python3 scripts/dev_server.py 8088 website`, then open http://localhost:8088
* **Rebuild the data feeds** from the raw exports (kept local, not in this repository): see `CLAUDE.md` section 4.
* **Check every view**: `node scripts/render_check.js`

## Data in this repository

The feeds under `website/data/` and `data/` are **pre-aggregated working copies** for the preview. Personal contact data
(mobile numbers, e-mail addresses) is masked. The raw exports (`raw/`) are never published. October 2026 figures are
depressed by the MOBII / MOBO system migration (see `CLAUDE.md`). A later version will build the feeds by parsing a
local database instead of the raw exports.
"""

PAGES = """name: Deploy site to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website
      - id: deployment
        uses: actions/deploy-pages@v4
"""


def main():
    # keep dist-public/.git when it exists so every export becomes a new commit on top of the published history
    keep_repo = os.path.isdir(os.path.join(OUT, '.git'))
    if os.path.exists(OUT):
        for name in os.listdir(OUT):
            if name == '.git' and keep_repo:
                continue
            path = os.path.join(OUT, name)
            shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)
    os.makedirs(OUT, exist_ok=True)
    copied = masked_files = 0
    for rel in tracked_files():
        if not wanted(rel):
            continue
        src, dst = os.path.join(ROOT, rel), os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel.lower().endswith(TEXT_EXT):
            raw = open(src, encoding='utf-8', errors='replace', newline='').read()
            new = mask_csv(raw) if rel.lower().endswith('.csv') else mask_text(mask_json_keys(raw), quoted=rel.lower().endswith(('.json', '.js', '.html')))
            if new != raw:
                masked_files += 1
            open(dst, 'w', encoding='utf-8', newline='').write(new)
        else:
            shutil.copy2(src, dst)
        copied += 1
    open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write(README)
    os.makedirs(os.path.join(OUT, '.github', 'workflows'), exist_ok=True)
    open(os.path.join(OUT, '.github', 'workflows', 'pages.yml'), 'w', encoding='utf-8').write(PAGES)
    for d in ('dist-public/',):                       # keep the export folder out of the working repository
        gi = os.path.join(ROOT, '.gitignore')
        t = open(gi, encoding='utf-8').read()
        if d not in t:
            open(gi, 'a', encoding='utf-8').write('\n# Sanitized public export (scripts/prepare_public_release.py)\n' + d + '\n')

    # ---- verification: nothing personal may remain
    bad = []
    for base, _, names in os.walk(OUT):
        for n in names:
            p = os.path.join(base, n)
            if not n.lower().endswith(TEXT_EXT):
                continue
            s = open(p, encoding='utf-8', errors='ignore').read()
            for rx, kind in ((PHONE_QUOTED if n.lower().endswith(('.json', '.js', '.html')) else PHONE_BARE, 'phone number'), (EMAIL, 'e-mail address')):
                m = rx.search(s)
                if m:
                    bad.append((os.path.relpath(p, OUT), kind, s[max(0, m.start() - 30):m.end() + 10].replace('\n', ' ')))
    if bad:
        print('FAILED: personal data still present in the export:')
        for b in bad[:20]:
            print('  ', b)
        sys.exit(1)

    # ---- git: first run starts a fresh history; later runs add a commit when something changed
    env = dict(os.environ)
    if not keep_repo:
        subprocess.check_call(['git', 'init', '-q', '-b', 'main'], cwd=OUT)
    subprocess.check_call(['git', 'add', '-A'], cwd=OUT)
    changed = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=OUT).returncode != 0
    if changed or not keep_repo:
        src_head = subprocess.check_output(['git', 'log', '-1', '--format=%h %s'], cwd=ROOT).decode().strip()
        msg = 'Initial public release (sanitized export, no history)' if not keep_repo else 'Update from working repository: ' + src_head
        subprocess.check_call(['git', 'commit', '-q', '-m', msg], cwd=OUT, env=env)
        print('committed:', msg)
    else:
        print('no changes since the last export')
    size = sum(os.path.getsize(os.path.join(b, n)) for b, _, ns in os.walk(OUT) if '.git' not in b for n in ns)
    big = sorted(((os.path.getsize(os.path.join(b, n)), os.path.relpath(os.path.join(b, n), OUT)) for b, _, ns in os.walk(OUT) if '.git' not in b for n in ns), reverse=True)[:3]
    print(f'OK: {copied} files copied, {masked_files} files had personal data masked, {size/1e6:.0f} MB, fresh git repo in {OUT}')
    print('largest files:', ', '.join(f'{r} ({s/1e6:.1f} MB)' for s, r in big), '(GitHub blocks files over 100 MB)')
    print('\nFirst publication only (manual, from dist-public/, never from the project root):')
    print('  1. create an EMPTY public repository on GitHub under the shatya-fram account (no README)')
    print('  2. git remote add origin https://github.com/shatya-fram/<repository-name>.git')
    print('  3. git push -u origin main   (sign in with your own account or a personal access token; GitHub no longer accepts account passwords for git)')
    print('  4. repository Settings > Pages > Source: GitHub Actions')


if __name__ == '__main__':
    main()
