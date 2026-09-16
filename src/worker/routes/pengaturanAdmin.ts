import { Hono } from "hono";
import { adminAtauTolak } from "../lib/aksesAdmin";
import { catatAudit } from "../lib/audit";
import type { EnvDenganRahasia } from "../lib/auth";
import { aturPendaftaranDitutupManual, pendaftaranDitutupManual } from "../lib/pengaturan";

type PayloadPengaturan = { pendaftaranDitutupManual: boolean };

function payloadPengaturan(data: unknown): data is PayloadPengaturan {
	return Boolean(data) && typeof data === "object" && typeof (data as Record<string, unknown>).pendaftaranDitutupManual === "boolean";
}

/** Penutupan Pendaftaran Manual (lihat CONTEXT.md): satu-satunya sakelar Admin di /admin/pengaturan. */
export function buatRutePengaturanAdmin(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		return c.json({ pendaftaranDitutupManual: await pendaftaranDitutupManual(c.env.DB) });
	});

	route.post("/", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadPengaturan(body)) return c.json({ error: "permintaan_tidak_valid" }, 400);

		await aturPendaftaranDitutupManual(c.env.DB, body.pendaftaranDitutupManual);
		await catatAudit(
			c.env.DB,
			{
				aktor: "Admin bersama",
				aktorUserId: akses.sesi.user.id,
				sesiId: akses.sesi.session.id,
				tindakan: body.pendaftaranDitutupManual ? "tutup_pendaftaran" : "buka_pendaftaran",
				hasil: "berhasil",
			},
			sekarang(),
		);
		return c.json({ pendaftaranDitutupManual: body.pendaftaranDitutupManual });
	});

	return route;
}
