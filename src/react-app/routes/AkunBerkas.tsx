import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KELOMPOK_BERKAS } from "~/lib/kelompok";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { ambilKelengkapanBerkas, type KelengkapanBerkas } from "~/react-app/lib/akunBerkas";

/** Sepuluh baris `k1..k10` dari `vKelengkapan`, diindeks per nomor kelompok. */
function kelompokHadir(data: KelengkapanBerkas): Record<number, number> {
	return {
		1: data.k1,
		2: data.k2,
		3: data.k3,
		4: data.k4,
		5: data.k5,
		6: data.k6,
		7: data.k7,
		8: data.k8,
		9: data.k9,
		10: data.k10,
	};
}

export function AkunBerkas() {
	const [data, setData] = useState<KelengkapanBerkas | null>(null);
	const [pesan, setPesan] = useState("Memuat kelompok berkas…");

	useEffect(() => {
		const controller = new AbortController();
		ambilKelengkapanBerkas(controller.signal)
			.then((hasil) => {
				setData(hasil);
				setPesan("");
			})
			.catch((err) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setPesan("Status Kelengkapan Berkas tidak dapat dimuat.");
			});
		return () => controller.abort();
	}, []);

	const hadir = data ? kelompokHadir(data) : null;

	return (
		<div>
			<h2 className="font-display text-3xl text-navy">Berkas</h2>
			<p className="mt-2 text-muted-foreground">
				Unggah, hapus, dan unduh kembali berkas per kelompok. Ganti berkas dilakukan dengan hapus lalu unggah.
			</p>
			{pesan ? (
				<p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
					{pesan}
				</p>
			) : null}
			{hadir ? (
				<ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-white">
					{KELOMPOK_BERKAS.map((kelompok) => (
						<li key={kelompok.nomor}>
							<Link
								to={`/akun/berkas/${kelompok.nomor}`}
								className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-muted"
							>
								<span>
									<span className="block text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
										Kelompok {kelompok.nomor}
									</span>
									<span className="block font-medium text-navy">{kelompok.label}</span>
								</span>
								<StatusBadge terbuka={Boolean(hadir[kelompok.nomor])}>
									{hadir[kelompok.nomor] ? "Hadir" : "Belum"}
								</StatusBadge>
							</Link>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
