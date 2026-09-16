import type { ReactNode } from "react";
import { ResponsiveImage } from "~/react-app/components/ResponsiveImage";

type Props = {
	judul: string;
	ilustrasi?: { src: string; alt: string; intrinsicWidth: number; intrinsicHeight: number };
	children: ReactNode;
};

/**
 * Ukuran hero — satu sumber dipakai bersama Beranda (yang punya subjudul dan
 * ilustrasi menumpang ke panel papan, jadi tidak memakai komponen ini
 * langsung) agar "ukuran hero" tetap sama di semua halaman publik meski
 * isinya berbeda. Tinggi hero dikunci lewat viewport (90vh ponsel, 75vh layar
 * lebar) — bukan lewat tinggi ilustrasi seperti sebelumnya — supaya beda
 * rasio gambar (ketum/sekjend/bendum) tidak lagi membuat hero-nya beda tinggi.
 * Ilustrasi dikunci lewat tinggi + object-contain (bukan lebar) agar selalu
 * pas pada baris grid yang penuh, tanpa "tenggelam" di luar batas hero.
 */
// `overflow-x-hidden` mencegah ilustrasi lebar (mis. rasio landscape setelah
// dipotong) meluber ke samping. Sumbu-y dibiarkan bisa terlihat di sini
// karena Beranda menumpangkan ilustrasinya ke panel papan lewat margin
// negatif (`-mb-*`) — `PublicPageHero` sendiri menambah `overflow-hidden`
// penuh karena rute yang memakainya tidak pernah butuh ilustrasi meluber.
export const KELAS_SEKSI_HERO = "flex min-h-[90vh] flex-col overflow-x-hidden bg-merah text-white lg:min-h-[75vh]";
export const KELAS_GRID_HERO =
	"mx-auto grid w-full max-w-[76rem] flex-1 grid-rows-[1fr_auto] items-center gap-6 px-4 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-1 lg:gap-8 lg:pt-16";
export const KELAS_JUDUL_HERO =
	"font-display text-[clamp(2.5rem,8vw,5.25rem)] leading-[0.95] font-normal uppercase [text-shadow:0.02em_0.02em_0_var(--marun),0.04em_0.04em_0_var(--marun)]";
// Tinggi ditulis langsung dari viewport (bukan `h-full`/100%): grid barisnya
// `1fr`, jadi tinggi 100% dari ilustrasi akan melingkar — ukuran ilustrasi
// mendorong tinggi baris, tinggi baris balik menentukan 100% ilustrasi,
// browser jatuh ke ukuran asli berkas (yang bisa jauh melebihi batas hero).
// `max-w-none` di atas mengalahkan reset Tailwind (`img { max-width: 100% }`)
// yang kalau tidak akan menyempitkan lebar ke kolom grid dan membuat
// object-contain melenceng dari kotak yang seharusnya.
export const KELAS_ILUSTRASI_HERO =
	"h-[46vh] w-auto max-w-[90vw] shrink-0 justify-self-center self-end object-contain lg:h-[calc(75vh-4rem)] lg:max-w-none";

/**
 * Bingkai hero merah, sama seperti Beranda (DESIGN.md "Beranda publik") tapi
 * tanpa panel papan yang menumpang: konten utama langsung di atas latar
 * putih halaman, bukan kartu yang mengambang.
 */
export function PublicPageHero({ judul, ilustrasi, children }: Props) {
	return (
		<>
			<section className={`${KELAS_SEKSI_HERO} overflow-y-hidden`}>
				<div className={`${KELAS_GRID_HERO} ${ilustrasi ? "" : "pb-10 sm:pb-14 lg:pb-16"}`}>
					<div>
						<h1 className={KELAS_JUDUL_HERO}>{judul}</h1>
					</div>
					{ilustrasi ? (
						<ResponsiveImage
							src={ilustrasi.src}
							alt={ilustrasi.alt}
							width={960}
							intrinsicWidth={ilustrasi.intrinsicWidth}
							intrinsicHeight={ilustrasi.intrinsicHeight}
							className={KELAS_ILUSTRASI_HERO}
							loading="eager"
						/>
					) : null}
				</div>
			</section>
			<section className="mx-auto max-w-[76rem] px-4 py-10 text-navy sm:px-8 sm:py-14">{children}</section>
		</>
	);
}
