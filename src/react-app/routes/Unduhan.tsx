import { useEffect, useState } from "react";
import { DaftarBerkasPublik } from "~/react-app/components/DaftarBerkasPublik";
import { ambilUnduhan, type BerkasPublik } from "~/react-app/lib/berkasPublik";

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

	return (
		<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
			<h1 className="font-display text-3xl text-navy">Unduhan</h1>
			<p className="mt-2 max-w-[60ch] text-muted-foreground">Formulir A.1 sampai A.6 untuk melengkapi pendaftaran Bakal Calon Ketua Umum.</p>
			{gagal ? <p className="mt-6 text-marun">Unduhan tidak dapat dimuat. Muat ulang halaman ini.</p> : !berkas ? <p className="mt-6 text-muted-foreground">Memuat unduhan…</p> : <div className="mt-6"><DaftarBerkasPublik berkas={berkas} /></div>}
		</section>
	);
}
