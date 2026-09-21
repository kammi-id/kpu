import { Link, NavLink } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { useTahap } from "~/react-app/lib/useTahap";
import muktamarLockupPutih from "~/react-app/assets/brand/muktamar-xiv-lockup-putih.webp";

const TAUTAN_NAV = [
	{ ke: "/peraturan", label: "Peraturan" },
	{ ke: "/jadwal", label: "Jadwal" },
	{ ke: "/unduhan", label: "Unduhan" },
	{ ke: "/tentang", label: "Tentang" },
];

export function Header() {
	const { data } = useTahap();
	// Optimistis tampil sebelum tahap termuat, sama seperti Daftar.tsx — server
	// tetap menolak bila salah. Disembunyikan (bukan dinonaktifkan) saat tertutup:
	// header tidak punya ruang untuk alasan tertulis seperti hero Beranda.
	const bolehRegistrasi = data?.bolehRegistrasi ?? true;

	return (
		<header className="bg-merah text-white">
			<div className="mx-auto flex max-w-[76rem] flex-col px-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
				<NavLink to="/" className="flex items-center gap-3 py-3">
					{/* `alt=""` dan tanpa `aria-label`: teks di sebelahnya sudah menjadi nama
					    tautan ini. Sebelumnya `aria-label` menimpa teks yang terlihat sehingga
					    nama aksesibelnya tidak memuat teks itu (label-content-name-mismatch),
					    yang mematahkan perintah suara "klik Komisi Penjaringan Umum".
					    `width`/`height` mencegah pergeseran tata letak sebelum gambar termuat. */}
					<img
						src={muktamarLockupPutih}
						alt=""
						width={230}
						height={240}
						className="h-16 w-auto"
					/>
					<span className="text-xs leading-tight font-semibold sm:text-sm">
						Komisi Penjaringan Umum
						<br />
						Muktamar KAMMI XIV
					</span>
				</NavLink>
				<div className="flex flex-col gap-3 border-t border-white/20 py-2 lg:flex-row lg:items-center lg:gap-5 lg:border-t-0 lg:py-0">
					<nav aria-label="Navigasi utama">
						<ul className="flex gap-1 overflow-x-auto text-sm font-semibold">
							{TAUTAN_NAV.map((tautan) => (
								<li key={tautan.ke}>
									<NavLink
										to={tautan.ke}
										className={({ isActive }) =>
											`inline-block px-3 py-2.5 whitespace-nowrap text-white ${
												isActive ? "underline decoration-2 underline-offset-[0.2em]" : ""
											}`
										}
									>
										{tautan.label}
									</NavLink>
								</li>
							))}
						</ul>
					</nav>
					{bolehRegistrasi ? (
						<Button
							render={<Link to="/daftar" />}
							size="sm"
							className="w-full shrink-0 bg-white text-merah shadow-none hover:bg-white/90 lg:w-auto"
						>
							Daftar
						</Button>
					) : null}
				</div>
			</div>
		</header>
	);
}
