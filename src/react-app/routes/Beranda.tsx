import { Link } from "react-router-dom";
import { FileText, CalendarDays, Download, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SplitFlap } from "~/react-app/components/SplitFlap";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { KELAS_GRID_HERO, KELAS_ILUSTRASI_HERO, KELAS_JUDUL_HERO, KELAS_SEKSI_HERO, SIZES_ILUSTRASI_HERO } from "~/react-app/components/PublicPageHero";
import { ResponsiveImage } from "~/react-app/components/ResponsiveImage";
import { useTahap } from "~/react-app/lib/useTahap";
import { alasanPendaftaranTertutup, LABEL_TAHAP, PENJELASAN_TAHAP } from "~/react-app/lib/tahap";
import { ketum } from "~/react-app/assets/generated";

const PINTU = [
	{ ke: "/peraturan", label: "Peraturan", ikon: FileText, deskripsi: "Ringkasan PKPU dan dokumen lengkap" },
	{ ke: "/jadwal", label: "Jadwal", ikon: CalendarDays, deskripsi: "Sepuluh tahap resmi, seluruhnya WIB" },
	{ ke: "/unduhan", label: "Unduhan", ikon: Download, deskripsi: "Formulir A.1 sampai A.6" },
];

export function Beranda() {
	const { data, error } = useTahap();

	return (
		<>
			<section className={KELAS_SEKSI_HERO}>
				<div className={KELAS_GRID_HERO}>
					<div>
						<h1 className={KELAS_JUDUL_HERO}>Pendaftaran Bakal Calon Ketua Umum PP KAMMI</h1>
						<p className="mt-4 text-lg font-semibold">Muktamar KAMMI XIV Ambon</p>
					</div>
					<ResponsiveImage
						gambar={ketum}
						alt="Ilustrasi Ketua KPU Muktamar XIV KAMMI"
						loading="eager"
						sizes={SIZES_ILUSTRASI_HERO}
						fetchPriority="high"
						className={`relative z-0 -mb-8 sm:-mb-10 lg:-mb-12 ${KELAS_ILUSTRASI_HERO}`}
					/>
				</div>
			</section>

			<section className="relative z-10 mx-auto -mt-6 max-w-[76rem] px-4 sm:-mt-10 sm:px-8">
				<div className="rounded-2xl bg-white p-5 text-navy shadow-[0_28px_60px_-28px_rgb(70_0_8_/_0.55),0_2px_8px_rgb(70_0_8_/_0.14)] sm:p-8">
					{error ? (
						<p className="text-marun">
							Tahap saat ini tidak dapat dimuat. Muat ulang halaman ini.
						</p>
					) : !data ? (
						<p className="text-muted-foreground">Memuat tahap berjalan…</p>
					) : (
						<div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
							<div>
								<div className="flex items-center justify-between gap-3">
									<p className="text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
										Tahap berjalan
									</p>
									<StatusBadge terbuka={data.bolehRegistrasi}>
										{data.bolehRegistrasi ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}
									</StatusBadge>
								</div>
								<div className="mt-2">
									<SplitFlap teks={LABEL_TAHAP[data.tahap]} />
									<span className="sr-only">{LABEL_TAHAP[data.tahap]}</span>
								</div>
								<p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed">
									{PENJELASAN_TAHAP[data.tahap]}
								</p>
								<div className="mt-5 flex flex-col gap-3 sm:flex-row">
									{data.bolehRegistrasi ? (
										<Button render={<Link to="/daftar" />} size="lg" className="w-full sm:w-auto">
											Daftar
										</Button>
									) : (
										<div>
											{/* Tombol ditutup tahap (DESIGN.md): tetap tampil dan dapat difokus
											    (focusableWhenDisabled), arsiran diagonal, terhubung ke alasan
											    tertulis di bawahnya. */}
											<Button
												disabled
												focusableWhenDisabled
												size="lg"
												aria-describedby="alasan-daftar-tertutup"
												className="w-full bg-[repeating-linear-gradient(135deg,var(--muted)_0_7px,var(--accent)_7px_14px)] text-marun/70 shadow-none hover:bg-[repeating-linear-gradient(135deg,var(--muted)_0_7px,var(--accent)_7px_14px)] sm:w-auto"
											>
												<Lock className="size-5" aria-hidden />
												Daftar
											</Button>
											<p id="alasan-daftar-tertutup" className="mt-2 text-sm text-marun">
												{alasanPendaftaranTertutup(data)}
											</p>
										</div>
									)}
									<Button render={<Link to="/masuk" />} variant="outline" size="lg" className="w-full sm:w-auto">
										Masuk
									</Button>
								</div>
							</div>
							<div className="border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
								<p className="text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
									Jadwal berikutnya
								</p>
								<ul className="mt-2 space-y-2">
									{data.jadwal
										.filter((item) => item.status !== "selesai")
										.slice(0, 3)
										.map((item) => (
											<li key={item.nama} className="text-sm">
												<span className="font-semibold">{item.nama}</span>
												<span className="block text-muted-foreground tabular-nums">{item.rentangWib} WIB</span>
											</li>
										))}
								</ul>
							</div>
						</div>
					)}
				</div>
			</section>

			<section className="mx-auto grid max-w-[76rem] gap-4 px-4 py-10 sm:grid-cols-3 sm:px-8">
				{PINTU.map((pintu) => (
					<Link
						key={pintu.ke}
						to={pintu.ke}
						className="flex items-center gap-3 rounded-xl border border-border bg-white px-5 py-4 text-navy transition-colors hover:bg-muted"
					>
						<pintu.ikon className="size-6 text-merah" aria-hidden />
						<span>
							<span className="block font-semibold">{pintu.label}</span>
							<span className="block text-sm text-muted-foreground">{pintu.deskripsi}</span>
						</span>
					</Link>
				))}
			</section>
		</>
	);
}
