import { Hono } from "hono";
import { rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { ambilStruktur, type JenisStruktur } from "../lib/struktur";

function jenisValid(nilai: string | undefined): nilai is JenisStruktur {
	return nilai === "pw" || nilai === "pd";
}

/**
 * Proxy struktur PW/PD kammi.id (tiket 21): rute publik murni infrastruktur,
 * tidak ada data Bakal Calon di sini — hanya daftar nama struktur organisasi.
 * Menjaga token kammi.id di server, sama seperti routes/nia.ts.
 */
export function buatRuteStruktur() {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		if (!rahasiaTersedia(c.env) || !c.env.KAMMI_ID_TOKEN) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const jenis = c.req.query("jenis");
		if (!jenisValid(jenis)) return c.json({ error: "jenis_tidak_valid" }, 400);

		const ancestor = c.req.query("ancestor");
		if (jenis === "pd" && !ancestor) return c.json({ error: "ancestor_wajib" }, 400);

		const hasil = await ambilStruktur(jenis, ancestor, c.env);
		if (!hasil.sukses) return c.json({ error: "struktur_gagal_upstream" }, 502);
		return c.json(hasil.data);
	});

	return route;
}
