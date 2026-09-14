import { NavLink } from "react-router-dom";
import kammi from "~/react-app/assets/brand/kammi.webp";
import muktamarLockupPutih from "~/react-app/assets/brand/muktamar-xiv-lockup-putih.webp";

const TAUTAN_NAV = [
	{ ke: "/peraturan", label: "Peraturan" },
	{ ke: "/jadwal", label: "Jadwal" },
	{ ke: "/unduhan", label: "Unduhan" },
	{ ke: "/tentang", label: "Tentang" },
];

export function Header() {
	return (
		<header className="bg-merah text-white">
			<div className="mx-auto flex max-w-[76rem] items-center justify-between gap-4 px-4 py-3 sm:px-8">
				<NavLink to="/" className="flex items-center gap-2" aria-label="Beranda KPU Muktamar XIV KAMMI">
					<img src={kammi} alt="Logo Pengurus Pusat KAMMI" className="h-9 w-auto" />
					<span className="hidden text-xs leading-tight font-semibold sm:block">
						Pengurus Pusat
						<br />
						Kesatuan Aksi Mahasiswa Muslim Indonesia
					</span>
				</NavLink>
				<img src={muktamarLockupPutih} alt="Muktamar KAMMI XIV" className="h-8 w-auto sm:h-10" />
			</div>
			<nav
				aria-label="Navigasi utama"
				className="border-t border-white/20"
			>
				<ul className="mx-auto flex max-w-[76rem] gap-1 overflow-x-auto px-4 text-sm font-semibold sm:px-8">
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
		</header>
	);
}
