import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { SlotBerkasPublik } from "~/react-app/components/SlotBerkasPublik";
import { ambilDokumenResmi, ambilHasilVerifikasi, ambilUnduhan, type BerkasPublik } from "~/react-app/lib/berkasPublik";

const FORMULIR = ["Formulir A.1", "Formulir A.2", "Formulir A.3", "Formulir A.4", "Formulir A.5", "Formulir A.6"];
const JUDUL_SALINAN_PERATURAN = "Peraturan";
const JUDUL_JADWAL_RESMI = "Jadwal Resmi";

function useDaftarBerkas(ambil: () => Promise<BerkasPublik[]>) {
	const [data, setData] = useState<BerkasPublik[] | null>(null);
	const [memuat, setMemuat] = useState(true);
	const [error, setError] = useState(false);
	const muatUlang = useCallback(async () => {
		setMemuat(true);
		setError(false);
		try {
			const terbaru = await ambil();
			setData(terbaru);
			return terbaru;
		} catch (err) {
			setError(true);
			throw err;
		} finally {
			setMemuat(false);
		}
	}, [ambil]);
	useEffect(() => { void muatUlang().catch(() => {}); }, [muatUlang]);
	return { data, memuat, error, muatUlang };
}

function DaftarBerkas({ daftar, children }: { daftar: ReturnType<typeof useDaftarBerkas>; children: ReactNode }) {
	return (
		<div className="mt-3">
			<p role="status" aria-live="polite" className="text-sm text-muted-foreground">
				{daftar.memuat ? "Memuat daftar berkas…" : daftar.error ? "Daftar berkas tidak dapat dimuat. Status berkas belum dapat dipastikan." : ""}
			</p>
			{daftar.error ? <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void daftar.muatUlang().catch(() => {})}>Coba lagi</Button> : null}
			{daftar.data !== null ? (
				<fieldset disabled={daftar.memuat || daftar.error} aria-busy={daftar.memuat} className="min-w-0">
					{daftar.error ? <p className="my-3 text-sm text-muted-foreground">Berikut data terakhir yang berhasil dimuat. Muat ulang daftar sebelum mengubah berkas.</p> : null}
					{children}
				</fieldset>
			) : null}
		</div>
	);
}

export function AdminUnggahBerkas() {
	const hasilVerifikasi = useDaftarBerkas(ambilHasilVerifikasi);
	const formulir = useDaftarBerkas(ambilUnduhan);
	const dokumen = useDaftarBerkas(ambilDokumenResmi);

	return (
		<div className="grid gap-10">
			<div>
				<h2 className="font-display text-3xl text-navy">Unggah Berkas</h2>
				<p className="mt-2 text-muted-foreground">Berkas Publik yang dapat diunduh siapa pun tanpa akun.</p>
			</div>
			<section aria-labelledby="hasil-verifikasi">
				<h3 id="hasil-verifikasi" className="text-xl font-semibold text-navy">Pengumuman Hasil Verifikasi</h3>
				<p className="mt-1 text-sm text-muted-foreground">PDF terbaru digunakan oleh tombol unduh di beranda. Jika dihapus, berkas sebelumnya digunakan; jika tidak ada unggahan, tombol unduh di beranda dinonaktifkan.</p>
				<DaftarBerkas daftar={hasilVerifikasi}>
					<SlotBerkasPublik kategori="hasil-verifikasi" judul="Hasil Verifikasi" urutan={1} berkas={hasilVerifikasi.data ?? []} onUbah={hasilVerifikasi.muatUlang} />
				</DaftarBerkas>
			</section>
			<section aria-labelledby="dokumen-resmi">
				<h3 id="dokumen-resmi" className="text-xl font-semibold text-navy">Dokumen Resmi</h3>
				<p className="mt-1 text-sm text-muted-foreground">Ditampilkan di /peraturan dan /jadwal.</p>
				<DaftarBerkas daftar={dokumen}>
					<div className="grid gap-4 sm:grid-cols-2">
						<SlotBerkasPublik
							kategori="peraturan"
							judul={JUDUL_SALINAN_PERATURAN}
							urutan={1}
							berkas={(dokumen.data ?? []).filter((item) => item.judul === JUDUL_SALINAN_PERATURAN)}
							onUbah={dokumen.muatUlang}
						/>
						<SlotBerkasPublik
							kategori="peraturan"
							judul={JUDUL_JADWAL_RESMI}
							urutan={2}
							berkas={(dokumen.data ?? []).filter((item) => item.judul === JUDUL_JADWAL_RESMI)}
							onUbah={dokumen.muatUlang}
						/>
					</div>
				</DaftarBerkas>
			</section>
			<section aria-labelledby="formulir-unduhan">
				<h3 id="formulir-unduhan" className="text-xl font-semibold text-navy">Formulir Unduhan</h3>
				<p className="mt-1 text-sm text-muted-foreground">Formulir A.1 sampai A.6, ditampilkan di /unduhan.</p>
				<DaftarBerkas daftar={formulir}>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{FORMULIR.map((judul, index) => (
							<SlotBerkasPublik
								key={judul}
								kategori="formulir"
								judul={judul}
								urutan={index + 1}
								berkas={(formulir.data ?? []).filter((item) => item.judul === judul)}
								onUbah={formulir.muatUlang}
							/>
						))}
					</div>
				</DaftarBerkas>
			</section>
		</div>
	);
}
