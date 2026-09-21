import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import muktamarLockupWarna from "~/react-app/assets/brand/muktamar-xiv-lockup-warna.webp";
import { OutletBerjeda } from "~/react-app/components/OutletBerjeda";

/**
 * Gerbang akun: /masuk, /daftar, /onboard. Tanpa Header publik — halaman ini
 * bukan bagian dari navigasi situs, jadi identitas KAMMI ditulis ulang di sini
 * (logo + teks seperti Header) dan satu tautan kembali menggantikan nav.
 * Footer disembunyikan di sini: pengecualian acceptance 34, hanya berlaku
 * untuk rute publik non-administratif ini (bukan /bacalon atau /admin).
 */
export function GerbangLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<div className="flex flex-1 flex-col items-center gap-10 bg-muted px-4 py-10 sm:px-8">
				<Link to="/" className="flex shrink-0 items-center gap-3">
					{/* Sama seperti Header: teks di sebelahnya yang menjadi nama tautan. */}
					<img
						src={muktamarLockupWarna}
						alt=""
						width={230}
						height={240}
						className="h-14 w-auto sm:h-16"
					/>
					<span className="text-xs leading-tight font-semibold text-navy sm:text-sm">
						Komisi Penjaringan Umum
						<br />
						Muktamar KAMMI XIV
					</span>
				</Link>
				{/* `<main>`: rute gerbang tidak memakai Layout publik, jadi landmark-nya
				    ditulis di sini — tanpa ini /masuk, /daftar dan /onboard adalah
				    satu-satunya halaman tanpa titik lompat "ke konten utama". */}
				<main className="flex w-full flex-1 items-center justify-center">
					<OutletBerjeda />
				</main>
				<Link
					to="/"
					className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-merah underline underline-offset-[0.2em] hover:text-merah-tua"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Kembali ke halaman depan
				</Link>
			</div>
		</div>
	);
}
