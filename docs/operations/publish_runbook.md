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

## Gerbang keselarasan angka (11 Nov 2026)
`publish_all.sh` menutup setiap publish dengan `scripts/verify_portal_alignment.js`: laporan S&D di landing page (bundle terenkripsi, didekripsi dengan `portal/_keys.json` lokal) harus **sama nilai demi nilai** dengan situs S&D live, untuk periode November dan Oktober (46 file: 13 feed x 2 periode + feed pendukung + kode). Satu-satunya selisih yang ditoleransi: nama outlet yang disamarkan situs publik (teks "disamarkan"). Kode (`app.js`, `stock.js`, dst.) harus identik byte demi byte.
* `--portal-only` mensyaratkan situs S&D live berada di HEAD yang sama; kalau tidak, hasilnya `NOT COMPARABLE` (exit 2) dan publish dianggap belum selesai: jalankan `publish_all.sh` tanpa `--portal-only`.
* `--sd-only` meninggalkan portal di commit lama; skrip menulis catatan, dan portal harus dipublish juga.
* `--align` hanya menjalankan gerbang (sekitar 2 menit, mengunduh sekitar 100 MB). `SKIP_ALIGN=1` melewatinya.
* Gagal (exit 1) berarti ada angka atau kode yang berbeda: jangan laporkan "terbit"; publish ulang kedua situs dari commit yang sama.


## Deploy fails with "No artifacts named github-pages were found" (24 Nov 2026)
- Symptom: the Pages run of the pushed commit fails after about 40 s in `actions/deploy-pages` ("Found 0 artifact(s)"), also for the empty-commit retries; githubstatus.com shows no incident. It is GitHub-side (artifact listing not ready), not a hang and not the data. The same publish worked about five minutes later.
- `publish_all.sh` now waits 60, 120, 180 and 240 s before each of up to four empty-commit retries, and **does not publish the portal when the S&D deploy failed**, so the two sites never show different numbers (on 24 Nov the portal went out first). If it still fails: run `scripts/publish_all.sh --sd-only`, then `scripts/publish_all.sh --portal-only` (or `--align`), then `--check`.
