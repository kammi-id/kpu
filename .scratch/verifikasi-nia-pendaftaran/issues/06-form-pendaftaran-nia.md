# 06: Form pendaftaran: alur NIA di UI

**What to build:** Calon pendaftar mengisi NIA, menekan "Cek NIA", dan begitu terverifikasi, Nama Lengkap terisi otomatis (read-only) serta sisa form (email, WhatsApp, kata sandi, persetujuan) terbuka. Mereka bisa menekan "Reset" untuk mengganti NIA yang salah tanpa kehilangan isian lain, dan submit akhir membuat akun lewat NIA yang sama.

**Blocked by:** 03 (Endpoint "Cek NIA"), 04 (Penggerbangan NIA di pendaftaran akhir)

**Status:** done

- [x] Field "Nama lengkap" manual diganti field NIA (11 digit numerik) sebagai field pertama form pendaftaran.
- [x] Field lain (email, WhatsApp, kata sandi, persetujuan) nonaktif sampai verifikasi NIA sukses.
- [x] Tombol eksplisit "Cek NIA" memicu panggilan ke endpoint Ticket 03 (tidak otomatis saat mengetik/blur).
- [x] Sukses: NIA dan Nama Lengkap sama-sama jadi read-only dengan indikator visual "terverifikasi"; field lain terbuka.
- [x] Tombol "Reset" eksplisit mengosongkan dan membuka kembali hanya NIA dan Nama Lengkap; nilai field lain yang sudah diisi user dipertahankan; status validasi kembali ke belum terverifikasi.
- [x] Pesan galat berbeda ditampilkan untuk: format tidak valid, tidak ditemukan, sudah terdaftar, tidak memenuhi syarat, dan kegagalan upstream/jaringan (yang terakhir ini jelas mengundang coba lagi, bukan disamakan dengan NIA tidak valid).
- [x] Submit akhir mengirim `nia` ke handler pendaftaran dari Ticket 04.
- [x] Perilaku ini diverifikasi manual di browser — tidak ada test komponen baru, konsisten dengan konvensi codebase ini.

## Comments

Implemented entirely in `src/react-app/routes/Daftar.tsx`:

- NIA is now the first field (`inputMode="numeric"`, input sanitized to digits and capped at 11 chars on every keystroke via `onChange`). A dedicated Turnstile widget (separate token/state from the final-submit one) gates the "Cek NIA" button — disabled until 11 digits are entered, a Turnstile token is present, and no request is in flight.
- "Cek NIA" (`type="button"`, so it never triggers form submit) POSTs to `/api/nia/cek` with `{ nia }` and `x-captcha-response`. On `{ nama }` success it sets `namaVerifikasi`/`niaTerverifikasi`; otherwise maps `body.error` through a new `PESAN_GALAT_NIA` dictionary covering all 5 `verifikasiNia` failure reasons (`nia_format_tidak_valid`, `nia_sudah_terdaftar`, `nia_tidak_ditemukan`, `nia_tidak_memenuhi_syarat`, `nia_gagal_upstream` — the last one explicitly phrased as a retry, not "invalid NIA") plus the endpoint's own `turnstile_tidak_valid`/`terlalu_banyak_permintaan`/`permintaan_tidak_valid`/`layanan_tidak_tersedia`.
- On success both NIA and Nama Lengkap become `readOnly` (not `disabled`, so their values still post via `FormData`) plus a `Badge` reading "NIA terverifikasi". Email/WhatsApp/Kata sandi/Persetujuan/final-submit-Turnstile live in a nested `<fieldset disabled={!niaTerverifikasi}>` that only opens post-verification; the submit button is additionally gated on `niaTerverifikasi`.
- "Reset" (replaces the "Cek NIA" button once verified) clears `nia`/`namaVerifikasi`/`niaTerverifikasi`/`pesanNia`/`tokenTurnstileNia` only — email/WhatsApp/password state lives in uncontrolled DOM inputs untouched by this reset, so their values survive exactly as spec'd. Since the NIA Turnstile widget is only rendered while `!niaTerverifikasi`, toggling verification off remounts it fresh, forcing a new challenge before the next "Cek NIA" attempt.
- Final submit is unchanged plumbing-wise: `kirim()` still does `Object.fromEntries(new FormData(...))`, which now naturally includes `nia` (and the server-verified `name`, echoed back into the read-only field) because both inputs are inside the form and not `disabled`. Extended the existing `PESAN_GALAT` dictionary (for `/api/auth/sign-up/email` failures) with the same 5 `nia_*` codes, since ticket 04's re-verification can reject at submit time too (e.g. a race-condition duplicate) — worded to point the user back to the Reset button.

Verification (manual in browser, no new component tests, per this ticket's own acceptance criteria and the spec's Testing Decisions):
- `npx tsc -b` and `npx eslint src/react-app/routes/Daftar.tsx` clean.
- `npx vitest run`: 147/151 passing; the 4 failures are pre-existing `adminBacalon.test.ts` flakiness confirmed present identically with this ticket's diff fully reverted (unrelated to this change — see that file's own tests, which pass 17/17 in isolation).
- Ran the actual dev server (`.dev.vars` created locally from `.dev.vars.example` with Turnstile "always passes" test keys and no `KAMMI_ID_TOKEN`, plus `wrangler d1 migrations apply --local` to initialize the local D1 schema) and drove `/daftar` via Chrome DevTools:
  - Confirmed NIA input sanitizes non-digit input and caps at 11 chars; "Cek NIA" stays disabled until 11 digits + Turnstile token present.
  - Confirmed the real `layanan_tidak_tersedia` path end-to-end (no `KAMMI_ID_TOKEN` locally) — clicking "Cek NIA" shows "Cek NIA sedang tidak tersedia. Coba lagi nanti.", matching the dictionary.
  - Mocked only the `/api/nia/cek` fetch response to simulate a kammi.id success and confirmed: NIA + Nama Lengkap turn read-only, "NIA terverifikasi" badge appears, email/WhatsApp/password/persetujuan/submit all unlock.
  - Filled email/WhatsApp/password, then clicked "Reset": confirmed NIA + Nama Lengkap cleared and re-editable, "Cek NIA" reappears (disabled again, fresh Turnstile challenge required), and email/WhatsApp/password values were preserved exactly while those fields re-locked.
- Real kammi.id success/AB3/aktif/duplicate/not-found responses were **not** exercised against the live API in this session (no `KAMMI_ID_TOKEN` available in this worktree) — those code paths are already covered by ticket 02/03/04's existing automated test suites (`src/worker/lib/nia.test.ts`, `src/worker/routes/nia.test.ts`), which this ticket's UI change doesn't touch.
