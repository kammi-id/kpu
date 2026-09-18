# 02: Modul verifikasi NIA bersama

**What to build:** Satu fungsi verifikasi NIA yang bisa dipanggil untuk mengecek format 11 digit, duplikasi lokal, dan kecocokan + kelayakan (Anggota Biasa III + Keadaan Kader aktif) lewat Sistem Keanggotaan KAMMI (kammi.id) — mengembalikan nama terverifikasi atau alasan gagal yang spesifik. Fungsi ini menjadi satu-satunya sumber kebenaran yang dipakai ulang oleh endpoint pengecekan interaktif (Ticket 03) maupun handler pendaftaran akhir (Ticket 04); belum ada endpoint HTTP atau UI di ticket ini.

**Blocked by:** 01 (Migrasi skema NIA)

**Status:** done

- [x] Fungsi menolak NIA yang bukan persis 11 digit angka, tanpa memanggil API eksternal.
- [x] Fungsi mendeteksi NIA yang sudah dipakai akun `bacalon` lain di database lokal, tanpa memanggil API eksternal. Urutan pengecekan: format → duplikat lokal → panggilan eksternal, sehingga duplikat yang sudah diketahui tidak memicu panggilan API yang tidak perlu.
- [x] Fungsi memanggil API pencarian anggota kammi.id (`https://www.kammi.id/api/v1/members/{nia}`) dengan token dari secret `KAMMI_ID_TOKEN` (ditambahkan ke tipe secret aplikasi, sejajar dengan secret Better Auth/Turnstile/onboarding yang sudah ada), memakai konvensi panggilan luar yang sudah ada di codebase ini (fetch tunggal, `AbortSignal.timeout` 10 detik, tanpa retry).
- [x] Respons 404 dari kammi.id menghasilkan alasan gagal "tidak ditemukan".
- [x] Respons sukses dengan `jenjangKaderisasi` bukan persis `"AB3"` atau `keadaanKader` bukan persis `"aktif"` menghasilkan alasan gagal "tidak memenuhi syarat".
- [x] Respons sukses dengan `jenjangKaderisasi === "AB3"` dan `keadaanKader === "aktif"` menghasilkan hasil sukses berisi `nama` persis dari respons kammi.id.
- [x] Kegagalan jaringan atau status HTTP lain dari kammi.id menghasilkan alasan gagal generik yang ditandai bisa dicoba ulang, berbeda dari alasan "tidak ditemukan"/"tidak memenuhi syarat".
- [x] Seluruh perilaku di atas diuji lewat pemanggilan fungsi secara langsung, dengan panggilan kammi.id di-mock di level jaringan memakai helper mock jaringan bersama yang sudah dipakai untuk Turnstile siteverify.

## Comments

Implemented in `src/worker/lib/nia.ts`, single exported function:

```ts
export async function verifikasiNia(nia: string, env: EnvDenganRahasia): Promise<HasilVerifikasiNia>
```

Result type (discriminated union, ready for ticket 03/04 to pattern-match):

```ts
export type HasilVerifikasiNia =
	| { sukses: true; nama: string }
	| { sukses: false; alasan: AlasanGagalVerifikasiNia };

export type AlasanGagalVerifikasiNia =
	| "formatTidakValid"
	| "duplikatLokal"
	| "tidakDitemukan"
	| "tidakMemenuhiSyarat"
	| "gagalUpstream"; // jaringan gagal atau status HTTP lain — generik, boleh dicoba ulang
```

Notes for ticket 03 (endpoint pengecekan) and ticket 04 (penggerbangan signup), which both call this directly:
- `env` param is `EnvDenganRahasia` (from `./auth`, now carrying `KAMMI_ID_TOKEN?: string` alongside the existing Better Auth/Turnstile/onboarding secrets) — callers just need `env.DB` and `env.KAMMI_ID_TOKEN` populated, no extra setup.
- Order is exactly as specced: format (regex `^[0-9]{11}$`, no I/O) → local duplicate (`SELECT ... WHERE "nia" = ? AND "role" = 'bacalon'`, D1 only, no I/O) → kammi.id call. A known-bad NIA never reaches the network.
- On success, `nama` is passed through byte-for-byte from kammi.id's JSON body — no trimming/transformation — since ticket 04 writes this straight into `user.name`.
- `jenjangKaderisasi`/`keadaanKader` are exact-string-matched (`=== "AB3"` / `=== "aktif"`); any other value (including case variants) falls into `tidakMemenuhiSyarat`, per spec's "Further Notes" (AB3 is the ceiling jenjang, "aktif" is the only accepted Keadaan Kader).
- kammi.id base URL (`https://www.kammi.id/api/v1/members`) is a fixed in-code constant, same pattern as the Turnstile siteverify URL in `src/worker/index.ts` — not an env var.
- The outer `try/catch` around the single `fetch` (mirrors `verifikasiTurnstile`) also wraps `response.json()`, so a malformed/unparsable success body is treated the same as a network failure (`gagalUpstream`), not a crash.
- No HTTP route, no rate-limiting, no Turnstile enforcement here by design — this ticket is the pure function only; ticket 03 owns the endpoint (auth-free, Turnstile-required, per-IP rate-limited) and must not duplicate this logic, only call it.

Tests in `src/worker/lib/nia.test.ts` (8 cases, all calling `verifikasiNia` directly, no HTTP layer): format rejection (several invalid shapes, no `jaringan.use` registered at all to prove no network call happens), local duplicate (row inserted directly via SQL, also no `jaringan.use` registered), 404 → `tidakDitemukan`, wrong `jenjangKaderisasi` alone → `tidakMemenuhiSyarat`, wrong `keadaanKader` alone → `tidakMemenuhiSyarat`, success → exact `nama` passthrough (also asserts the `Authorization: Bearer <token>` header reaches kammi.id), thrown/network-level failure → `gagalUpstream`, and HTTP 500 → `gagalUpstream`. Network failure is simulated by throwing inside the MSW resolver rather than `HttpResponse.error()` — the latter produced noisy (but harmless) unhandled-rejection output from the `@mswjs/interceptors` internals in this Miniflare/vitest setup; throwing avoids that while still exercising the same `catch` branch.

`npx tsc -b tsconfig.worker.json --force` is clean. `npx vitest run src/worker/lib/nia.test.ts` — 8/8 passed, no unhandled errors.

Worktree note: this work was actually done from a separate isolated worktree (`.claude/worktrees/agent-a9dbaa0daa1093ad1`, branch `worktree-agent-a9dbaa0daa1093ad1`) rather than the `worktree-verifikasi-nia-pendaftaran` worktree this ticket file lives in — that worktree was locked/in use by another session and this session's sandbox could not run Bash inside it. Ticket 01's commit (`15933c3`) was re-applied via `git format-patch`/`git am` onto this branch first (same tree/content, new SHA) so this branch has identical starting state. Whoever picks up ticket 03/04 should build on whichever branch ends up canonical; the diff itself is branch-agnostic.
