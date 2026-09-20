/**
 * Analisis statis migrasi D1: mencari `DROP TABLE` atas tabel yang masih
 * menjadi INDUK dari foreign key `ON DELETE CASCADE`.
 *
 * Latar belakang (insiden 18 September 2026): migrasi 0003 membangun ulang
 * tabel "user" dengan pola SQLite biasa (CREATE tabel baru → INSERT SELECT →
 * DROP TABLE lama → RENAME). Di D1 penegakan foreign key SELALU menyala
 * (`PRAGMA foreign_keys` = 1) dan TIDAK dapat dimatikan: `PRAGMA foreign_keys
 * = OFF` diterima tanpa galat tetapi diabaikan diam-diam. Sesuai dokumentasi
 * SQLite, `DROP TABLE` menjalankan `DELETE FROM` implisit, sehingga aksi
 * `ON DELETE CASCADE` ikut berjalan dan MENGHAPUS seluruh baris anak.
 *
 * Akibatnya seluruh isi "account" (hash kata sandi Better Auth), "session",
 * "profil", dan "berkas" terhapus — Admin tidak bisa login lagi walau
 * kredensialnya benar, karena tidak ada lagi hash untuk dicocokkan.
 *
 * `PRAGMA defer_foreign_keys = true` yang disarankan dokumentasi D1 TIDAK
 * menolong di sini: ia hanya menunda PEMERIKSAAN pelanggaran sampai commit,
 * bukan menunda AKSI cascade. Sudah diuji, baris anak tetap hilang.
 *
 * Pola aman untuk membangun ulang tabel induk di D1: salin dulu baris anak ke
 * tabel simpanan sementara, lakukan penggantian induk, kembalikan baris anak,
 * lalu hapus tabel simpanan — semuanya di dalam satu berkas migrasi.
 */

export type Migrasi = { name: string; queries: string[] };

export type PelanggaranCascade = {
	/** Nama berkas migrasi tempat DROP TABLE berbahaya itu berada. */
	migrasi: string;
	/** Tabel induk yang dijatuhkan. */
	induk: string;
	/** Tabel anak yang barisnya akan ikut terhapus, terurut. */
	anak: string[];
};

const POLA_BUAT_TABEL = /^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_]\w*)"?\s*\(([\s\S]*)\)\s*;?\s*$/i;
const POLA_JATUHKAN_TABEL = /^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z_]\w*)"?/i;
const POLA_GANTI_NAMA = /^\s*ALTER\s+TABLE\s+"?([A-Za-z_]\w*)"?\s+RENAME\s+TO\s+"?([A-Za-z_]\w*)"?/i;

/**
 * Menangkap klausa `REFERENCES <tabel> [(kolom)] <aksi…>` beserta seluruh
 * aksi yang mengikutinya, supaya `ON DELETE CASCADE` dapat dibedakan dari
 * `ON UPDATE CASCADE` maupun `ON DELETE SET NULL`.
 */
const POLA_REFERENSI =
	/REFERENCES\s+"?([A-Za-z_]\w*)"?\s*(?:\([^)]*\))?((?:\s+(?:ON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|RESTRICT|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT)|MATCH\s+\w+|(?:NOT\s+)?DEFERRABLE(?:\s+INITIALLY\s+\w+)?))*)/gi;

/** Tabel induk yang dirujuk badan CREATE TABLE dengan ON DELETE CASCADE. */
export function indukCascade(badanTabel: string): string[] {
	const induk = new Set<string>();
	for (const [, tabel, aksi] of badanTabel.matchAll(POLA_REFERENSI)) {
		if (/ON\s+DELETE\s+CASCADE/i.test(aksi ?? "")) induk.add(tabel);
	}
	return [...induk];
}

/**
 * Menjalankan ulang seluruh migrasi secara berurutan sambil memelihara graf
 * `induk → anak` untuk foreign key cascade, lalu melaporkan setiap DROP TABLE
 * yang mengenai induk yang masih punya anak.
 *
 * Graf dipelihara PER NAMA, bukan per identitas tabel: setelah `DROP TABLE
 * "user"`, klausa REFERENCES di tabel anak tetap menyebut "user", dan
 * `RENAME TO "user"` berikutnya membuatnya sahih kembali. Karena itu daftar
 * anak sebuah induk sengaja TIDAK dibuang saat induknya dijatuhkan.
 */
export function periksaCascadeMigrasi(migrasi: readonly Migrasi[]): PelanggaranCascade[] {
	const anakPerInduk = new Map<string, Set<string>>();
	const indukPerAnak = new Map<string, Set<string>>();
	const pelanggaran: PelanggaranCascade[] = [];

	const daftarkan = (anak: string, induk: readonly string[]) => {
		if (!induk.length) return;
		indukPerAnak.set(anak, new Set(induk));
		for (const nama of induk) {
			const kumpulan = anakPerInduk.get(nama) ?? new Set<string>();
			kumpulan.add(anak);
			anakPerInduk.set(nama, kumpulan);
		}
	};

	const lepaskanAnak = (anak: string) => {
		for (const nama of indukPerAnak.get(anak) ?? []) anakPerInduk.get(nama)?.delete(anak);
		indukPerAnak.delete(anak);
	};

	for (const { name, queries } of migrasi) {
		for (const pernyataan of queries) {
			const buat = POLA_BUAT_TABEL.exec(pernyataan);
			if (buat) {
				const [, tabel, badan] = buat;
				lepaskanAnak(tabel);
				daftarkan(tabel, indukCascade(badan));
				continue;
			}

			const jatuhkan = POLA_JATUHKAN_TABEL.exec(pernyataan);
			if (jatuhkan) {
				const [, tabel] = jatuhkan;
				// Tabel tidak dihitung sebagai anaknya sendiri (FK rujukan-diri).
				const anak = [...(anakPerInduk.get(tabel) ?? [])].filter((nama) => nama !== tabel).sort();
				if (anak.length) pelanggaran.push({ migrasi: name, induk: tabel, anak });
				lepaskanAnak(tabel);
				continue;
			}

			const gantiNama = POLA_GANTI_NAMA.exec(pernyataan);
			if (gantiNama) {
				const [, lama, baru] = gantiNama;
				// Anak yang merujuk nama lama ikut pindah ke nama baru: SQLite
				// menulis ulang klausa REFERENCES milik mereka saat RENAME.
				const anakLama = anakPerInduk.get(lama);
				if (anakLama) {
					const anakBaru = anakPerInduk.get(baru) ?? new Set<string>();
					for (const nama of anakLama) {
						anakBaru.add(nama);
						indukPerAnak.get(nama)?.delete(lama);
						indukPerAnak.get(nama)?.add(baru);
					}
					anakPerInduk.set(baru, anakBaru);
					anakPerInduk.delete(lama);
				}
				const indukLama = indukPerAnak.get(lama);
				if (indukLama) {
					lepaskanAnak(lama);
					daftarkan(baru, [...indukLama]);
				}
			}
		}
	}

	return pelanggaran;
}
