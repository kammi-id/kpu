import { useEffect, useState } from "react";
import { DaftarBerkasPublik } from "~/react-app/components/DaftarBerkasPublik";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import { ambilPeraturan, type PeraturanPublik } from "~/react-app/lib/berkasPublik";

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

	return (
		<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
			<h1 className="font-display text-3xl text-navy">Peraturan</h1>
			<p className="mt-2 max-w-[60ch] text-muted-foreground">Ringkasan PKPU dan dokumen peraturan KPU Muktamar XIV KAMMI.</p>
			{gagal ? <p className="mt-6 text-marun">Peraturan tidak dapat dimuat. Muat ulang halaman ini.</p> : !data ? <p className="mt-6 text-muted-foreground">Memuat Peraturan…</p> : (
				<div className="mt-6 space-y-10">
					{data.isiMarkdown ? <SafeMarkdown>{data.isiMarkdown}</SafeMarkdown> : <p className="text-muted-foreground">Menyusul.</p>}
					<section aria-labelledby="dokumen-peraturan">
						<h2 id="dokumen-peraturan" className="font-display text-2xl text-navy">Dokumen Peraturan</h2>
						<div className="mt-4"><DaftarBerkasPublik berkas={data.berkasPublik} /></div>
					</section>
				</div>
			)}
		</section>
	);
}
