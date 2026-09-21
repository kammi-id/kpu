import { useEffect, useState } from "react";
import { KartuUnduhanBerkas } from "~/react-app/components/KartuUnduhanBerkas";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import peraturanKpu from "~/content/peraturan.md?raw";
import { ambilDokumenResmi, type BerkasPublik } from "~/react-app/lib/berkasPublik";
import { sekjend } from "~/react-app/assets/generated";

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
			ilustrasi={{ gambar: sekjend, alt: "Ilustrasi KPU Muktamar XIV KAMMI" }}
		>
			<div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
				<div className="order-2 lg:order-1"><SafeMarkdown variant="prose">{peraturanKpu}</SafeMarkdown></div>
				<div className="order-1 lg:sticky lg:top-8 lg:order-2"><KartuUnduhanBerkas judul="Dokumen Peraturan" berkas={dokumen} /></div>
			</div>
		</PublicPageHero>
	);
}
