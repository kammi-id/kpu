import { setupNetwork } from "@msw/cloudflare";

/**
 * Mock jaringan bersama untuk permintaan keluar Worker (tiket 10: siteverify
 * Turnstile di-stub pada tingkat jaringan, bukan lewat seam buatan). Uji
 * mendaftarkan handler lewat `jaringan.use(...)` per kasus.
 */
export const jaringan = setupNetwork();
