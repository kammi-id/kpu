import { CheckCircle2, ChevronDown, Circle, CircleDot } from "lucide-react";
import { useState } from "react";
import type { JadwalItemApi, StatusJadwal } from "~/react-app/lib/tahap";

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

/**
 * Jalur sepuluh tahap (DESIGN.md "Baris jadwal") sebagai garis waktu tegak:
 * segmen antar-tahap hijau bila tahap di atasnya sudah selesai, tahap
 * berjalan membesar dengan cincin berdenyut. Tahap yang telah selesai bisa
 * disembunyikan agar sepuluh baris tidak jadi tembok teks — bukan hiasan,
 * karena pada tahap awal (belum ada yang selesai) tombolnya tidak muncul.
 */
export function JadwalTimeline({ jadwal }: { jadwal: JadwalItemApi[] }) {
	const [tampilkanSelesai, setTampilkanSelesai] = useState(false);
	const jumlahSelesai = jadwal.filter((item) => item.status === "selesai").length;
	const ditampilkan = tampilkanSelesai ? jadwal : jadwal.filter((item) => item.status !== "selesai");

	return (
		<div>
			<div className="mb-5 flex items-center justify-between gap-3">
				<h2 className="font-display text-xl text-navy">Timeline</h2>
				{jumlahSelesai > 0 ? (
					<button
						type="button"
						onClick={() => setTampilkanSelesai((nilai) => !nilai)}
						aria-expanded={tampilkanSelesai}
						className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-merah hover:bg-muted"
					>
						<ChevronDown className={`size-4 transition-transform ${tampilkanSelesai ? "rotate-180" : ""}`} aria-hidden />
						{tampilkanSelesai ? "Sembunyikan yang selesai" : `Tampilkan ${jumlahSelesai} tahap yang selesai`}
					</button>
				) : null}
			</div>
			<ol className="flex flex-col">
				{ditampilkan.map((item, index) => {
					const Ikon = IKON_STATUS[item.status];
					const berjalan = item.status === "berjalan";
					const selesai = item.status === "selesai";
					const bukanTerakhir = index < ditampilkan.length - 1;
					return (
						<li key={item.nama} className="group relative flex gap-4 pb-7 last:pb-0">
							{bukanTerakhir ? (
								<span
									aria-hidden
									className={`absolute top-10 bottom-0 left-4 w-0.5 rounded-full transition-colors duration-500 ${
										selesai ? "bg-hijau" : "bg-border"
									}`}
								/>
							) : null}
							<span
								className={`relative z-10 flex shrink-0 items-center justify-center rounded-full transition-[width,height] duration-300 ${
									berjalan
										? "size-9 bg-merah text-white"
										: selesai
											? "size-8 bg-hijau text-white"
											: "size-8 border-2 border-border bg-white text-muted-foreground"
								}`}
							>
								{berjalan ? (
									<span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-merah/40 motion-safe:animate-ping" />
								) : null}
								<Ikon className={berjalan ? "size-5" : "size-4"} aria-hidden />
							</span>
							<div
								aria-current={berjalan ? "step" : undefined}
								className={`min-w-0 flex-1 rounded-xl px-4 py-3 transition-colors ${
									berjalan ? "bg-merah text-white" : "group-hover:bg-muted"
								}`}
							>
								<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
									<span className={`font-semibold ${berjalan ? "text-lg" : ""}`}>{item.nama}</span>
									<span
										className={`text-[0.8125rem] font-bold tracking-[0.08em] uppercase ${
											berjalan ? "text-white" : "text-muted-foreground"
										}`}
									>
										{LABEL_STATUS[item.status]}
									</span>
								</div>
								<p className={`mt-1 text-sm tabular-nums ${berjalan ? "text-white/90" : "text-muted-foreground"}`}>
									{item.rentangWib} WIB
								</p>
								<p className={`mt-0.5 text-sm ${berjalan ? "text-white/90" : "text-muted-foreground"}`}>{item.keterangan}</p>
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
