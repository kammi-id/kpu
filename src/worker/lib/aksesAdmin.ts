import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "./auth";
import { layananAktif, tahapPada } from "./tahap";

type KonteksAdmin = {
	env: EnvDenganRahasia;
	req: { raw: Request };
	json: (data: unknown, status?: 401 | 403) => Response;
};

/** Gerbang bersama seluruh rute khusus Admin (tiket 14 dkk): sesi, peran, dan tahap layanan. */
export async function adminAtauTolak(c: KonteksAdmin, sekarang: () => Date) {
	if (!rahasiaTersedia(c.env)) return { response: c.json({ error: "layanan_tidak_tersedia" }, 403) };
	const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
	if (!sesi || sesi.user.role !== "admin") return { response: c.json({ error: "tidak_berwenang" }, 401) };
	const tahap = tahapPada(sekarang());
	if (!layananAktif(tahap)) return { response: c.json({ error: "tahap_tertutup", tahap }, 403) };
	return { sesi };
}
