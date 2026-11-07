# Publikasi Package Ally SDK

Package dapat dipasang lewat `pnpm add` dari tarball sekarang, tanpa registry. Publikasi ke npm memungkinkan instalasi lewat nama paket, tetapi **belum dilakukan**.

## Status rilis saat ini

- `sdk/package.json` masih berisi `"private": true`, sehingga publikasi ditolak.
- `@ally/react` mengembalikan 404 di registry pada 2026-11-07; ini hanya berarti paket belum ditemukan, **bukan** bukti bahwa tim memiliki scope `@ally`.
- `pnpm whoami` pada lingkungan ini belum terautentikasi. Pemilik akun/organisasi npm harus login dan memiliki hak publish pada scope pilihan.
- Belum ada file `LICENSE`. Tentukan izin distribusi sebelum membuka paket untuk publik.

## Langkah setelah scope dan lisensi disepakati

1. Tentukan nama, misalnya `@NAMA_AKUN/ally-react`. Jika tim memang memiliki scope `@ally`, nama sekarang dapat dipertahankan. Ubah `name` dan hapus `"private": true` di `sdk/package.json`; tambahkan metadata lisensi yang disepakati. Perbarui semua contoh impor bila nama berubah.
2. Dari `sdk/`, jalankan `pnpm login`, lalu `pnpm whoami`. Akun harus memiliki hak publish ke scope tersebut.
3. Jalankan `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:ai:mock`, dan `pnpm test:contract`. Pemeriksaan consumer memakai store pnpm yang sudah terisi.
4. Periksa isi paket dengan `pnpm pack --json`: hanya `dist/`, `README.md`, panduan penggunaan/endpoint, dan `package.json` yang perlu masuk. Pastikan tidak ada API key, source test, atau `test-results/`.
5. Setelah perubahan direview dan Git bersih, jalankan `pnpm publish --access public --dry-run`, lalu `pnpm publish --access public`. Rilis scoped public memerlukan `--access public`; pnpm memeriksa branch dan working tree secara default. Proses publish dapat meminta autentikasi dua faktor.
6. Di proyek React host, jalankan `pnpm add @SCOPE/NAMA_PAKET@0.1.0 react@^19`, lalu ikuti [panduan penggunaan](USAGE.md). Versi yang sudah terbit tidak boleh dipakai ulang untuk perubahan berikutnya; naikkan versi sebelum rilis berikutnya.

Jika kebutuhan hackathon hanya berbagi ke rekan satu tim, tarball lokal lebih cepat: `pnpm -C sdk test:package`, lalu `pnpm add <path-ke-tarball>` di proyek host. Hindari publish publik sebelum nama, lisensi, dan isi paket disetujui tim.

Rujukan: [publikasi scoped public npm](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [field `private` di package.json](https://docs.npmjs.com/cli/configuring-npm/package-json/), dan [perintah `pnpm publish`](https://pnpm.io/cli/publish).
