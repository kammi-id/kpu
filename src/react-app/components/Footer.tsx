import muktamarLockupPutih from "~/react-app/assets/brand/muktamar-xiv-lockup-putih.webp";

/**
 * Komponen tetap di setiap rute (acceptance 34). Penegasan bahwa KPU adalah
 * badan internal Muktamar KAMMI, bukan penyelenggara pemilihan umum nasional.
 */
export function Footer() {
	return (
		<footer className="bg-marun text-white">
			<div className="mx-auto flex max-w-[76rem] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
				<img src={muktamarLockupPutih} alt="Muktamar KAMMI XIV" className="h-8 w-auto" />
				<p className="max-w-[56ch] text-sm leading-relaxed text-white">
					Komisi Penjaringan Umum (KPU) Muktamar XIV KAMMI adalah badan internal Muktamar
					KAMMI. KPU tidak memiliki hubungan atau afiliasi dengan penyelenggara pemilihan
					umum nasional. Situs resmi:{" "}
					<a href="https://kammi.id" className="underline underline-offset-[0.2em]">
						kammi.id
					</a>
					.
				</p>
			</div>
		</footer>
	);
}
