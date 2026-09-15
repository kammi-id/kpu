import { afterAll, afterEach, beforeAll } from "vitest";
import { jaringan } from "./jaringan";

// Menyalakan mock MSW untuk seluruh berkas uji Worker: permintaan keluar yang
// tidak didaftarkan lewat `jaringan.use(...)` pada suatu uji akan gagal,
// bukan menembus ke internet sungguhan (mis. siteverify Turnstile).
beforeAll(() => jaringan.enable());
afterEach(() => jaringan.resetHandlers());
afterAll(() => jaringan.disable());
