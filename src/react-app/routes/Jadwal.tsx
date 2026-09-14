import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { useTahap } from "~/react-app/lib/useTahap";
import type { StatusJadwal } from "~/react-app/lib/tahap";

const IKON_STATUS: Record<StatusJadwal, typeof CheckCircle2> = {
	selesai: CheckCircle2,
	berjalan: CircleDot,
	terjadwal: Circle,
};

const LABEL_STATUS: Record<StatusJadwal, string> = {
	selesai: "Selesai",
	berjalan: "Berjalan",
	terjadwal: "Terjadwal",
};

export function Jadwal() {
	const { data, error } = useTahap();

	return (
		<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
			<h1 className="font-display text-3xl text-navy">Jadwal Resmi</h1>
			<p className="mt-2 max-w-[60ch] text-muted-foreground">
				Sepuluh tahap penjaringan Calon Ketua Umum PP KAMMI, seluruhnya dalam waktu WIB.
			</p>

			{error ? (
				<p className="mt-6 text-marun">Jadwal tidak dapat dimuat. Muat ulang halaman ini.</p>
			) : !data ? (
				<p className="mt-6 text-muted-foreground">Memuat jadwal…</p>
			) : (
				<ol className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white">
					{data.jadwal.map((item) => {
						const Ikon = IKON_STATUS[item.status];
						const berjalan = item.status === "berjalan";
						return (
							<li
								key={item.nama}
								aria-current={berjalan ? "step" : undefined}
								className={`flex items-center gap-4 px-5 py-4 ${
									berjalan ? "bg-merah text-white" : "text-navy"
								}`}
							>
								<Ikon className="size-5 shrink-0" aria-hidden />
								<span className="flex-1 font-semibold">{item.nama}</span>
								<span className="tabular-nums">{item.rentangWib} WIB</span>
								<span
									className={`text-[0.8125rem] font-bold tracking-[0.08em] uppercase ${
										berjalan ? "text-white" : "text-muted-foreground"
									}`}
								>
									{LABEL_STATUS[item.status]}
								</span>
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
}
