import { useEffect, useState } from "react";
import { JadwalTimeline } from "~/react-app/components/JadwalTimeline";
import { KartuUnduhanBerkas } from "~/react-app/components/KartuUnduhanBerkas";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { ambilDokumenResmi, type BerkasPublik } from "~/react-app/lib/berkasPublik";
import { useTahap } from "~/react-app/lib/useTahap";
import bendahara from "~/react-app/assets/illustrations/bendum.png";

export function Jadwal() {
	const { data, error } = useTahap();
	const [dataBerkas, setDataBerkas] = useState<BerkasPublik[]>([]);

	useEffect(() => {
		const controller = new AbortController();
		ambilDokumenResmi(controller.signal).then(setDataBerkas).catch(() => undefined);
		return () => controller.abort();
	}, []);

	const dokumen = dataBerkas.find((item) => item.judul === "Jadwal Resmi");

	return (
		<PublicPageHero
			judul="Timeline Resmi KPU"
			ilustrasi={{ src: bendahara, alt: "Ilustrasi KPU Muktamar XIV KAMMI", intrinsicWidth: 1024, intrinsicHeight: 1481 }}
		>
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
