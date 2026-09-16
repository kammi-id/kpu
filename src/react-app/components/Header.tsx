import { NavLink } from "react-router-dom";
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
			<div className="mx-auto flex max-w-[76rem] flex-col px-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
				<NavLink to="/" className="flex items-center gap-3 py-3" aria-label="Beranda KPU Muktamar XIV KAMMI">
					<img src={muktamarLockupPutih} alt="Muktamar KAMMI XIV" className="h-16 w-auto" />
					<span className="text-xs leading-tight font-semibold sm:text-sm">
						Komisi Penjaringan Umum
						<br />
						Muktamar KAMMI XIV
					</span>
				</NavLink>
				<nav aria-label="Navigasi utama" className="border-t border-white/20 lg:border-t-0">
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
			</div>
		</header>
	);
}
