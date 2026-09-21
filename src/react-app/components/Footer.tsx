import { Globe } from "lucide-react";
import kammi from "~/react-app/assets/brand/kammi.webp";

function IkonInstagram({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
			className={className}
		>
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
		</svg>
	);
}

/**
 * Komponen tetap di setiap rute publik dan dasbor (acceptance 34), kecuali
 * GerbangLayout (/masuk, /daftar, /onboard) — pengecualian disengaja untuk
 * layar publik non-administratif tersebut. Penegasan bahwa KPU adalah badan
 * internal Muktamar KAMMI, bukan penyelenggara pemilihan umum nasional.
 */
export function Footer() {
	return (
		<footer className="bg-marun text-white">
			<div className="mx-auto max-w-[76rem] px-4 py-6 sm:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<img
							src={kammi}
							alt="Logo Pengurus Pusat KAMMI"
							width={186}
							height={240}
							className="h-9 w-auto"
						/>
						<span className="text-sm font-semibold">
							Kesatuan Aksi
							<br />
							Mahasiswa Muslim Indonesia
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						<a
							href="https://www.kammi.id"
							className="flex items-center gap-2 text-sm font-semibold underline underline-offset-[0.2em]"
						>
							<Globe className="size-4" aria-hidden />
							www.kammi.id
						</a>
						<a
							href="https://www.instagram.com/muktamarxivkammi/"
							className="flex items-center gap-2 text-sm font-semibold underline underline-offset-[0.2em]"
						>
							<IkonInstagram className="size-4" />
							muktamarxivkammi
						</a>
					</div>
				</div>
				<div className="mt-6 border-t border-white/20 pt-4 text-xs leading-relaxed">
					<p className="max-w-[70ch]">
						Komisi Penjaringan Umum (KPU) Muktamar XIV KAMMI adalah badan internal Muktamar KAMMI dan
						tidak memiliki hubungan atau afiliasi dengan penyelenggara pemilihan umum nasional. Situs
						ini tidak menayangkan identitas, profil, status, atau berkas Bakal Calon Ketua Umum kepada
						publik.
					</p>
					<p className="mt-2">© 2026 Komisi Penjaringan Umum Muktamar XIV KAMMI.</p>
				</div>
			</div>
		</footer>
	);
}
