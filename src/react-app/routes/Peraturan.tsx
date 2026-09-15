import { useEffect, useState } from "react";
import { KartuUnduhanBerkas } from "~/react-app/components/KartuUnduhanBerkas";
import { PublicPageHero } from "~/react-app/components/PublicPageHero";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import { ambilPeraturan, type PeraturanPublik } from "~/react-app/lib/berkasPublik";
import sekjen from "~/react-app/assets/illustrations/sekjend.png";

export function Peraturan() {
	const [data, setData] = useState<PeraturanPublik | null>(null);
	const [gagal, setGagal] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		ambilPeraturan(controller.signal).then(setData).catch(() => {
			if (!controller.signal.aborted) setGagal(true);
		});
		return () => controller.abort();
	}, []);

	const dokumen = data?.berkasPublik.find((item) => item.judul === "Peraturan");

	return (
		<PublicPageHero judul="Peraturan KPU" ilustrasi={{ src: sekjen, alt: "Ilustrasi KPU Muktamar XIV KAMMI" }}>
			{gagal ? (
				<p className="text-marun">Peraturan tidak dapat dimuat. Muat ulang halaman ini.</p>
			) : !data ? (
				<p className="text-muted-foreground">Memuat Peraturan…</p>
			) : (
				<div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
					<div className="order-2 lg:order-1">
						{data.isiMarkdown ? <SafeMarkdown>{data.isiMarkdown}</SafeMarkdown> : <p className="text-muted-foreground">Menyusul.</p>}
					</div>
					<div className="order-1 lg:sticky lg:top-8 lg:order-2">
						<KartuUnduhanBerkas judul="Dokumen Peraturan" berkas={dokumen} />
					</div>
				</div>
			)}
		</PublicPageHero>
	);
}
