import kpu from "~/react-app/assets/illustrations/kpu.png";
import khaidir from "~/react-app/assets/members/khaidir.png";
import robby from "~/react-app/assets/members/robby.png";
import alfiansyah from "~/react-app/assets/members/alfiansyah.png";
import rafika from "~/react-app/assets/members/rafika.png";
import ilham from "~/react-app/assets/members/ilham.png";

const ANGGOTA = [
	{ nama: "Khaidir Ali, S.H", foto: khaidir },
	{ nama: "Robby Kaharuddin, M.E", foto: robby },
	{ nama: "Alfiansyah, M.K.M", foto: alfiansyah },
	{ nama: "Rafika Afriyanti", foto: rafika },
	{ nama: "R. Ilham Sastra Ardhie Purnomo", foto: ilham },
];

export function Tentang() {
	return (
		<>
			<section className="bg-white">
				<div className="mx-auto flex max-w-[76rem] flex-col items-center px-4 pt-14 text-center sm:px-8 sm:pt-20 lg:pt-24">
					<h1 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.95] font-normal text-navy uppercase [text-shadow:0.02em_0.02em_0_var(--marun),0.04em_0.04em_0_var(--marun)]">
						Komisi Penjaringan Umum
					</h1>
					<p className="mt-4 text-[0.9375rem] font-bold tracking-[0.08em] text-merah uppercase sm:text-base">
						Muktamar KAMMI XIV 2026
					</p>
				</div>
				<div className="mx-auto mt-10 max-w-[60rem] px-6 sm:mt-14 sm:px-10 lg:mt-16">
					<img
						src={kpu}
						alt="Ilustrasi lima anggota Komisi Penjaringan Umum Muktamar XIV KAMMI"
						className="mx-auto h-auto w-full"
					/>
				</div>
			</section>

			<section className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
				<p className="border-b-2 border-navy pb-2 text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
					Anggota KPU
				</p>
				<ol className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
					{ANGGOTA.map((orang) => (
						<li
							key={orang.nama}
							className="flex flex-col overflow-hidden rounded-2xl bg-muted px-6 pt-6 sm:px-8 sm:pt-7"
						>
							<span className="text-xl leading-snug font-bold text-navy sm:text-2xl">{orang.nama}</span>
							<img
								src={orang.foto}
								alt=""
								className="mt-auto h-64 w-auto self-center object-contain object-bottom filter-[drop-shadow(2px_0_0_white)_drop-shadow(-2px_0_0_white)_drop-shadow(0_2px_0_white)_drop-shadow(0_-2px_0_white)_drop-shadow(1.5px_1.5px_0_white)_drop-shadow(-1.5px_-1.5px_0_white)_drop-shadow(1.5px_-1.5px_0_white)_drop-shadow(-1.5px_1.5px_0_white)_drop-shadow(0_10px_12px_rgb(70_0_8/0.22))] sm:h-72"
							/>
						</li>
					))}
				</ol>
			</section>
		</>
	);
}
