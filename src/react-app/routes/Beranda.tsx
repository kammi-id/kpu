import { Link } from "react-router-dom";
import { cn } from "cn";
import { FileText, CalendarDays, Download } from "lucide-react";
import { buttonVariants } from "~/components/ui/button";
import { SplitFlap } from "~/react-app/components/SplitFlap";
import { Badge } from "~/components/ui/badge";
import { IlustrasiHero, KELAS_GRID_HERO, KELAS_JUDUL_HERO, KELAS_SEKSI_HERO } from "~/react-app/components/PublicPageHero";
import { useTahap } from "~/react-app/lib/useTahap";
import { tampilkanBadgePembaruan, type Tahap } from "~/react-app/lib/tahap";
import { ketum } from "~/react-app/assets/generated";

const PETUNJUK: Record<Tahap, string> = {
	BelumDibuka: "Unduh surat hasil verifikasi dan periksa status berkas Anda.",
	MasaPendaftaran: "Unduh surat hasil verifikasi dan periksa status berkas Anda.",
	Pemeriksaan: "Unduh surat hasil verifikasi dan periksa status berkas Anda. Bagi bakal calon yang perlu perbaikan, siapkan dokumen untuk diunggah melalui akun pada 3–5 Oktober 2026.",
	MasaPerbaikan: "Bagi bakal calon yang perlu perbaikan, masuk ke akun dan lengkapi berkas paling lambat 5 Oktober 2026 pukul 23.59 WIB. Penetapan dan pengumuman Calon Ketua Umum Tetap dijadwalkan pada 6 Oktober 2026.",
	Terkunci: "Masa perbaikan telah berakhir. Penetapan dan pengumuman Calon Ketua Umum Tetap dijadwalkan pada 6 Oktober 2026. Ikuti pengumuman resmi KPU untuk tahapan selanjutnya.",
	Selesai: "Proses penjaringan telah selesai dan data telah dihapus.",
};

const PINTU = [
	{ ke: "/peraturan", label: "Peraturan", ikon: FileText, deskripsi: "Ringkasan PKPU dan dokumen lengkap" },
	{ ke: "/jadwal", label: "Jadwal", ikon: CalendarDays, deskripsi: "Jadwal tahapan terbaru, seluruhnya WIB" },
	{ ke: "/unduhan", label: "Unduhan", ikon: Download, deskripsi: "Formulir A.1 sampai A.6" },
];

export function Beranda() {
	const { data, error } = useTahap();
	const adaPembaruan = tampilkanBadgePembaruan(data?.sekarang);

	return (
		<>
			<section className={cn(KELAS_SEKSI_HERO, "min-h-0 overflow-x-clip overflow-y-clip lg:min-h-0")}>
				<div className={cn(KELAS_GRID_HERO, "grid-rows-[auto_auto] gap-4 pt-6 sm:pt-8 lg:grid-rows-1 lg:pt-8")}>
					<div>
						<h1 className={cn(KELAS_JUDUL_HERO, "text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] text-balance")}>
							<span className="block">Hasil Verifikasi Berkas</span>{" "}
							<span className="mt-4 block text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.05]">Bakal Calon Ketua Umum PP KAMMI</span>
						</h1>
						<p className="mt-4 text-lg font-semibold">Muktamar KAMMI XIV Ambon</p>
					</div>
					<IlustrasiHero
						gambar={ketum}
						alt="Ilustrasi Ketua KPU Muktamar XIV KAMMI"
						className="relative z-0 h-[clamp(12rem,30svh,20rem)] max-w-full lg:h-[clamp(18rem,48svh,30rem)] lg:max-w-full"
					/>
				</div>
			</section>

			<section aria-labelledby="judul-pengumuman" className="relative z-10 mx-auto -mt-6 max-w-[76rem] px-4 sm:-mt-10 sm:px-8">
				<div className="rounded-2xl bg-white p-5 text-navy shadow-[0_28px_60px_-28px_rgb(70_0_8_/_0.55),0_2px_8px_rgb(70_0_8_/_0.14)] sm:p-8">
					<div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
						<div>
							<h2 id="judul-pengumuman" className="sr-only">Hasil Verifikasi</h2>
							<SplitFlap teks="Hasil Verifikasi" className="[--ukuran-minimum-huruf:1.125rem]" />
							<div className="mt-3" role="status" aria-live="polite" aria-atomic="true">
								{error ? (
									<p className="text-marun">Petunjuk tahap saat ini tidak dapat dimuat. Muat ulang halaman ini atau lihat <Link to="/jadwal" className="underline underline-offset-2">jadwal tahapan</Link>.</p>
								) : !data ? (
									<p className="text-muted-foreground">Memuat petunjuk tahap berjalan…</p>
								) : (
									<p className="max-w-[56ch] text-[0.9375rem] leading-relaxed">{PETUNJUK[data.tahap]}</p>
								)}
							</div>
							<a
								href="/api/pengumuman/hasil-verifikasi"
								download
								className={cn(buttonVariants({ size: "lg" }), "mt-5 h-auto min-h-12 w-full py-3 whitespace-normal sm:w-auto")}
								aria-describedby="format-surat-verifikasi"
							>
								<Download className="size-5 shrink-0" aria-hidden />
								Unduh Surat Hasil Verifikasi
							</a>
							<p id="format-surat-verifikasi" className="mt-2 text-sm text-muted-foreground">PDF</p>

						</div>
						<div className="border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
							<h2 className="text-lg font-semibold">Tahapan saat ini dan berikutnya</h2>
							{data ? (
								<ul className="mt-3 space-y-3">
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
							) : (
								<p className="mt-3 text-sm text-muted-foreground">{error ? "Jadwal tidak dapat dimuat." : "Memuat jadwal…"}</p>
							)}
						</div>
					</div>
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
						<span className="flex flex-wrap items-center gap-2 font-semibold">
							{pintu.label}
							{adaPembaruan && pintu.ke === "/jadwal" ? <Badge className="bg-amber-300 text-marun">Diperbarui</Badge> : null}
						</span>
							<span className="block text-sm text-muted-foreground">{pintu.deskripsi}</span>
						</span>
					</Link>
				))}
			</section>
		</>
	);
}
