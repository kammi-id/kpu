// Skrip sekali pakai ADR 0003: hapus objek R2 berkas instruktur (Kelompok
// Berkas 4 lama) SEBELUM migrasi 0006 menghapus barisnya — migrasi SQL tidak
// dapat menyentuh R2, dan setelah 0006 berjalan r2Key-nya hilang dari D1
// sehingga objeknya jadi yatim.
//
//   node scripts/hapusBerkasInstruktur.mjs                 # production, hanya menampilkan
//   node scripts/hapusBerkasInstruktur.mjs --hapus         # production, benar-benar menghapus
//   node scripts/hapusBerkasInstruktur.mjs --env preview   # lingkungan preview
//
// Idempoten: menghapus objek R2 yang sudah tidak ada tetap berhasil. Menolak
// berjalan bila 0006 sudah diterapkan, karena sejak itu kelompok 4 berarti
// surat keterangan sehat.
import { execFileSync } from "node:child_process";

const MIGRASI = "0006_hapus_instruktur.sql";
const LINGKUNGAN = {
	production: { db: "kpu-kammi-2026", bucket: "kpu-kammi-2026-berkas", flag: [] },
	preview: { db: "kpu-kammi-2026-preview", bucket: "kpu-kammi-2026-berkas-preview", flag: ["--env", "preview"] },
};

const argumen = process.argv.slice(2);
const hapus = argumen.includes("--hapus");
const namaEnv = argumen.includes("--env") ? argumen[argumen.indexOf("--env") + 1] : "production";
const env = LINGKUNGAN[namaEnv];
if (!env) throw new Error(`--env tidak dikenal: ${namaEnv}`);

function wrangler(...args) {
	return execFileSync("npx", ["wrangler", ...args, ...env.flag], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

function kueri(sql) {
	const hasil = JSON.parse(wrangler("d1", "execute", env.db, "--remote", "--json", "--command", sql));
	return hasil[0].results;
}

const sudah = kueri(`SELECT COUNT(*) AS "n" FROM "d1_migrations" WHERE "name" = '${MIGRASI}'`)[0].n;
if (sudah > 0) {
	console.error(`${MIGRASI} sudah diterapkan di ${namaEnv}: kelompok 4 kini surat sehat. Skrip dihentikan.`);
	process.exit(1);
}

const berkas = kueri(`SELECT "id", "userId", "r2Key" FROM "berkas" WHERE "kelompok" = 4 ORDER BY "id"`);
console.log(`${namaEnv}: ${berkas.length} berkas instruktur (kelompok 4 lama).`);

for (const { id, userId, r2Key } of berkas) {
	// Bentuk sama dengan CHECK "r2Key" di tabel berkas; menolak apa pun selain itu.
	if (!/^berkas\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r2Key)) {
		throw new Error(`r2Key tak terduga pada berkas ${id}: ${r2Key}`);
	}
	console.log(`${hapus ? "hapus" : "akan dihapus"}: ${r2Key} (berkas ${id}, user ${userId})`);
	if (hapus) wrangler("r2", "object", "delete", `${env.bucket}/${r2Key}`, "--remote");
}

if (!hapus && berkas.length > 0) console.log("Jalankan ulang dengan --hapus untuk menghapus objek R2 di atas.");
