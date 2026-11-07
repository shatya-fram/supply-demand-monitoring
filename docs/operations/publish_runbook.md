# Publish runbook · Supply & Demand (GitHub Pages) dan landing page Inner Jakarta (portal)

Satu perintah: `scripts/publish_all.sh` (publish HEAD yang sudah di-commit ke dua situs, lalu **memverifikasi** hasilnya). Opsi: `--sd-only`, `--portal-only`, `--check` (hanya lihat kondisi live), `SKIP_CHECK=1` (lewati render_check).

## Proses sebelum (6–7 Nov 2026)
1. `prepare_public_release.py` → clone repo → timpa → commit → push (manual, 3 perintah terpisah).
2. Menunggu Pages: laporan "sudah dipublish" diberikan setelah push, **tanpa melihat hasil deploy**.
3. Deploy macet di `syncing_files` (situs 265 MB), timeout 10 menit; `gh run rerun` memakai artifact yang sama dan gagal lagi (4 kali untuk `dd71728`); baru berhasil setelah commit kosong membuat artifact baru.
4. Pengecekan "live" dengan `grep` di `app.js` (tidak pasti, kena cache), portal dicek dengan mata.
Akibat: dua kali laporan "terbit" padahal belum tayang, sekitar 40 menit terbuang per kejadian.

## Proses sesudah
| Langkah | Perubahan |
|---|---|
| Gerbang | `render_check.js` harus lulus, kalau gagal tidak ada yang terbit |
| Ekspor | HEAD saja (pekerjaan sesi lain yang belum di-commit tidak ikut), stempel `website/version.json` (`commit`, `built_at`) |
| Artifact | workflow menghapus `website/data/*.json` (kembaran JSON feed, 18 MB, tidak dimuat aplikasi) sebelum upload |
| Deploy | `timeout-minutes: 15`, `deploy-pages` `timeout: 300000` (gagal dalam 5 menit, bukan 10) |
| Tunggu | skrip menunggu run milik commit yang di-push (poll tahan putus koneksi `api.github.com`) |
| Gagal | otomatis **commit kosong baru** (artifact baru), maksimal 3 kali; bukan `gh run rerun` |
| Verifikasi | `version.json` live harus sama dengan commit yang dipublish (anti-cache `?t=`); portal: run Pages sukses dan `config.json` `cb` berubah |
| Laporan | hanya `DONE: everything verified` bila kedua situs lolos verifikasi |

## Aturan
* Jangan melaporkan "sudah terbit" sebelum `publish_all.sh` mencetak `DONE`.
* Portal memakai `portal/users.json` dan `portal/_keys.json` lokal (gitignored) dan laporan 01 dari `../../Inner Jakarta Focus Priority/Inner Jakarta Complete App (offline).html` (relatif terhadap folder proyek) (ubah dengan `INNER_HTML`).
* Bila situs terus bertambah besar: kurangi `website/archive/` (feed Oktober, 64 MB) atau pindahkan bagian besar ke Release asset; batas keras Pages 1 GB, batas praktis deploy cepat sekitar 100–150 MB.
