import { afterAll, afterEach, beforeAll } from "vitest";
import { network } from "./network";

// Menyalakan mock MSW untuk seluruh berkas uji Worker: permintaan keluar yang
// tidak didaftarkan lewat `network.use(...)` pada suatu uji akan gagal,
// bukan menembus ke internet sungguhan (mis. siteverify Turnstile).
beforeAll(() => network.enable());
afterEach(() => network.resetHandlers());
afterAll(() => network.disable());
