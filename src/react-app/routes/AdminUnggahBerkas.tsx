import { useEffect, useState } from "react";
import { SlotBerkasPublik } from "~/react-app/components/SlotBerkasPublik";
import { ambilDokumenResmi, ambilUnduhan, type BerkasPublik } from "~/react-app/lib/berkasPublik";

const FORMULIR = ["Formulir A.1", "Formulir A.2", "Formulir A.3", "Formulir A.4", "Formulir A.5", "Formulir A.6"];
const JUDUL_SALINAN_PERATURAN = "Peraturan";
const JUDUL_JADWAL_RESMI = "Jadwal Resmi";

export function AdminUnggahBerkas() {
	const [formulir, setFormulir] = useState<BerkasPublik[]>([]);
	const [dokumen, setDokumen] = useState<BerkasPublik[]>([]);
	const [pesan, setPesan] = useState("Memuat berkas…");

	async function muatFormulir() {
		const data = await ambilUnduhan();
		setFormulir(data);
	}

	async function muatDokumen() {
		setDokumen(await ambilDokumenResmi());
	}

	useEffect(() => {
		Promise.all([ambilUnduhan(), ambilDokumenResmi()])
			.then(([dataFormulir, dataDokumen]) => {
				setFormulir(dataFormulir);
				setDokumen(dataDokumen);
				setPesan("");
			})
			.catch(() => setPesan("Berkas tidak dapat dimuat."));
	}, []);

	return (
		<div className="grid gap-10">
			<div>
				<h2 className="font-display text-3xl text-navy">Unggah Berkas</h2>
				<p className="mt-2 text-muted-foreground">Berkas Publik yang dapat diunduh siapa pun tanpa akun.</p>
			</div>
			{pesan ? <p className="text-sm text-muted-foreground" aria-live="polite">{pesan}</p> : null}
			<section aria-labelledby="dokumen-resmi">
				<h3 id="dokumen-resmi" className="font-display text-xl text-navy">Dokumen Resmi</h3>
				<p className="mt-1 text-sm text-muted-foreground">Ditampilkan di /peraturan dan /jadwal.</p>
				<div className="mt-3 grid gap-4 sm:grid-cols-2">
					<SlotBerkasPublik
						kategori="peraturan"
						judul={JUDUL_SALINAN_PERATURAN}
						urutan={1}
						berkas={dokumen.filter((item) => item.judul === JUDUL_SALINAN_PERATURAN)}
						onUbah={muatDokumen}
					/>
					<SlotBerkasPublik
						kategori="peraturan"
						judul={JUDUL_JADWAL_RESMI}
						urutan={2}
						berkas={dokumen.filter((item) => item.judul === JUDUL_JADWAL_RESMI)}
						onUbah={muatDokumen}
					/>
				</div>
			</section>
			<section aria-labelledby="formulir-unduhan">
				<h3 id="formulir-unduhan" className="font-display text-xl text-navy">Formulir Unduhan</h3>
				<p className="mt-1 text-sm text-muted-foreground">Formulir A.1 sampai A.6, ditampilkan di /unduhan.</p>
				<div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{FORMULIR.map((judul, index) => (
						<SlotBerkasPublik
							key={judul}
							kategori="formulir"
							judul={judul}
							urutan={index + 1}
							berkas={formulir.filter((item) => item.judul === judul)}
							onUbah={muatFormulir}
						/>
					))}
				</div>
			</section>
		</div>
	);
}
