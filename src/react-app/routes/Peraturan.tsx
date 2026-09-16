import { useEffect, useState } from "react";
import { KartuUnduhanBerkas } from "~/react-app/components/KartuUnduhanBerkas";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import peraturanKpu from "~/content/peraturan.md?raw";
import { ambilDokumenResmi, type BerkasPublik } from "~/react-app/lib/berkasPublik";
import sekjen from "~/react-app/assets/illustrations/sekjend.png";

export function Peraturan() {
	const [dokumen, setDokumen] = useState<BerkasPublik | undefined>();

	useEffect(() => {
		const controller = new AbortController();
		ambilDokumenResmi(controller.signal)
			.then((berkas) => setDokumen(berkas.find((item) => item.judul === "Peraturan")))
			.catch(() => undefined);
		return () => controller.abort();
	}, []);

	return (
		<PublicPageHero
			judul="Peraturan KPU"
			ilustrasi={{ src: sekjen, alt: "Ilustrasi KPU Muktamar XIV KAMMI", intrinsicWidth: 1089, intrinsicHeight: 924 }}
		>
			<div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
				<div className="order-2 lg:order-1"><SafeMarkdown>{peraturanKpu}</SafeMarkdown></div>
				<div className="order-1 lg:sticky lg:top-8 lg:order-2"><KartuUnduhanBerkas judul="Dokumen Peraturan" berkas={dokumen} /></div>
			</div>
		</PublicPageHero>
	);
}
