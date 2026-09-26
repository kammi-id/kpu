import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { ambilUnduhan, type BerkasPublik, urlUnduhBerkasPublik } from "~/react-app/lib/berkasPublik";
import { agung } from "~/react-app/assets/generated";

function ukuranTerformat(byte: number) {
	return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
}

type EntriFormulir = { judul: string; nomor: string; deskripsi: string };

const FORMULIR_UTAMA: EntriFormulir = {
	judul: "Formulir A.1",
	nomor: "A.1",
	deskripsi: "Formulir biodata dan pernyataan kesiapan. Ditandatangani, lalu diunggah sebagai kelompok berkas 1.",
};

const FORMULIR_PELENGKAP: EntriFormulir = {
	judul: "Formulir A.2",
	nomor: "A.2",
	deskripsi: "Checklist kelengkapan sembilan kelompok berkas pendaftaran.",
};

const JALUR_REKOMENDASI: EntriFormulir[] = [
	{ judul: "Formulir A.3", nomor: "A.3", deskripsi: "Rekomendasi dari Pengurus Wilayah (PW)." },
	{ judul: "Formulir A.4", nomor: "A.4", deskripsi: "Rekomendasi dari Pengurus Daerah (PD)." },
];

const KELOMPOK_8_9: EntriFormulir[] = [
	{ judul: "Formulir A.5", nomor: "A.5", deskripsi: "Komitmen hafalan, diunggah sebagai kelompok berkas 8." },
	{ judul: "Formulir A.6", nomor: "A.6", deskripsi: "Pernyataan tidak sedang dijatuhi sanksi, kelompok berkas 9." },
];

function KartuFormulir({ entri, berkas, besar }: { entri: EntriFormulir; berkas: BerkasPublik[]; besar?: boolean }) {
	const daftarUnduhan = berkas.length > 0 ? (
		<ul className="grid min-w-0 gap-4">
			{berkas.map((item) => (
				<li key={item.id} className="grid min-w-0 gap-2">
					<div className="min-w-0">
						<p className="break-all text-sm font-semibold text-navy">{item.namaAsli}</p>
						<p className="text-xs text-muted-foreground tabular-nums">{ukuranTerformat(item.ukuranByte)}</p>
					</div>
					<Button render={<a href={urlUnduhBerkasPublik(item.id)} aria-label={`Unduh ${item.namaAsli}`} />} size={besar ? "default" : "sm"}>
						<Download className="size-4" aria-hidden />
						Unduh
					</Button>
				</li>
			))}
		</ul>
	) : <p className="text-sm text-muted-foreground">Menyusul.</p>;

	if (besar) {
		return (
			<div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-white p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
				<div>
					<p className="font-display text-4xl leading-none text-navy sm:text-5xl">{entri.nomor}</p>
					<p className="mt-2 max-w-[38ch] text-base text-muted-foreground">{entri.deskripsi}</p>
				</div>
				<div className="border-t border-border pt-5 sm:w-72 sm:shrink-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
					{daftarUnduhan}
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 sm:p-6">
			<p className="font-display text-2xl leading-none text-navy sm:text-3xl">{entri.nomor}</p>
			<p className="mt-2 max-w-[26ch] text-sm text-muted-foreground">{entri.deskripsi}</p>
			<div className="mt-4 flex-1 border-t border-border pt-4">
				{daftarUnduhan}
			</div>
		</div>
	);
}

export function Unduhan() {
	const [berkas, setBerkas] = useState<BerkasPublik[] | null>(null);
	const [gagal, setGagal] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		ambilUnduhan(controller.signal).then(setBerkas).catch(() => {
			if (!controller.signal.aborted) setGagal(true);
		});
		return () => controller.abort();
	}, []);

	function cari(judul: string) {
		return berkas?.filter((item) => item.judul === judul) ?? [];
	}

	return (
		<PublicPageHero
			judul="Berkas Kelengkapan"
			ilustrasi={{ gambar: agung, alt: "Ilustrasi KPU Muktamar XIV KAMMI" }}
		>
			<p className="max-w-[60ch] text-muted-foreground">
				Unduh templat resmi berikut, lengkapi sesuai petunjuk pada tiap formulir, lalu unggah kembali salinannya lewat akun
				Bakal Calon Ketua Umum selama Masa Pendaftaran atau Masa Perbaikan.
			</p>
			{gagal ? (
				<p className="mt-6 text-marun">Unduhan tidak dapat dimuat. Muat ulang halaman ini.</p>
			) : !berkas ? (
				<p className="mt-6 text-muted-foreground">Memuat unduhan…</p>
			) : (
				<div className="mt-8 grid gap-8">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr] sm:gap-5">
						<KartuFormulir entri={FORMULIR_UTAMA} berkas={cari(FORMULIR_UTAMA.judul)} besar />
						<KartuFormulir entri={FORMULIR_PELENGKAP} berkas={cari(FORMULIR_PELENGKAP.judul)} />
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
						{JALUR_REKOMENDASI.map((entri) => (
							<KartuFormulir key={entri.judul} entri={entri} berkas={cari(entri.judul)} />
						))}
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
						{KELOMPOK_8_9.map((entri) => (
							<KartuFormulir key={entri.judul} entri={entri} berkas={cari(entri.judul)} />
						))}
					</div>
				</div>
			)}
		</PublicPageHero>
	);
}
