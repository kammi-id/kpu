import { Hono } from "hono";
import { buatRuteTahap } from "./routes/tahap";

/**
 * Fungsi pembuat Worker: seluruh penolakan server, spanduk, dan status tombol
 * bersumber dari `sekarang`. Ekspor default memakai jam nyata; uji menyuntikkan
 * jam tetap lewat fungsi ini alih-alih membaca `Date.now()` langsung.
 */
export function buatWorker(sekarang: () => Date = () => new Date()) {
	const app = new Hono<{ Bindings: Env }>();

	app.route("/api/tahap", buatRuteTahap(sekarang));

	app.notFound((c) => c.json({ error: "tidak_ditemukan" }, 404));

	return {
		fetch: app.fetch,
		async scheduled(_controller: ScheduledController, _env: Env, _ctx: ExecutionContext) {
			// Ekspor Harian, Snapshot Pemeriksaan, dan Penghapusan Akhir: lihat tiket 16 dan 18.
		},
	};
}

export default buatWorker();
