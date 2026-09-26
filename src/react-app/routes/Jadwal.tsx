import { useEffect, useState } from "react";
import { JadwalTimeline } from "~/react-app/components/JadwalTimeline";
import { KartuUnduhanBerkas } from "~/react-app/components/KartuUnduhanBerkas";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { ambilDokumenResmi, type BerkasPublik } from "~/react-app/lib/berkasPublik";
import { useTahap } from "~/react-app/lib/useTahap";
import { bendum } from "~/react-app/assets/generated";

export function Jadwal() {
	const { data, error } = useTahap();
	const [dataBerkas, setDataBerkas] = useState<BerkasPublik[]>([]);

	useEffect(() => {
		const controller = new AbortController();
		ambilDokumenResmi(controller.signal).then(setDataBerkas).catch(() => undefined);
		return () => controller.abort();
	}, []);

	const dokumen = dataBerkas.filter((item) => item.judul === "Jadwal Resmi");

	return (
		<PublicPageHero
			judul="Jadwal Tahapan Terbaru"
			ilustrasi={{ gambar: bendum, alt: "Ilustrasi KPU Muktamar XIV KAMMI" }}
		>
			<div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-navy">
				<p className="font-bold text-marun">Pendaftaran diperpanjang hingga 30 September 2026 pukul 23.59 WIB.</p>
				<p className="mt-2 text-sm leading-relaxed">Biaya pendaftaran Rp3.000.000,00. Transfer ke Bank Mandiri rekening <strong className="tabular-nums">1240011178838</strong> atas nama Kesatuan Aksi Mahasiswa Muslim Indonesia. Selesaikan berkas dan pembayaran sesuai batas waktu.</p>
			</div>
			{error ? (
				<p className="text-marun">Jadwal tidak dapat dimuat. Muat ulang halaman ini.</p>
			) : !data ? (
				<p className="text-muted-foreground">Memuat jadwal…</p>
			) : (
				<div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
					<div className="order-2 lg:order-1">
						<JadwalTimeline jadwal={data.jadwal} />
					</div>
					<div className="order-1 lg:sticky lg:top-8 lg:order-2">
						<KartuUnduhanBerkas judul="Jadwal Resmi" berkas={dokumen} />
					</div>
				</div>
			)}
		</PublicPageHero>
	);
}
