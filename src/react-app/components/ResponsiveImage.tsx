import type { GambarResponsif, VarianGambar } from "~/react-app/assets/generated";

export type { GambarResponsif };

type Props = {
	gambar: GambarResponsif;
	alt: string;
	className?: string;
	loading?: "lazy" | "eager";
	/**
	 * Lebar tampil gambar ini, dalam bentuk atribut `sizes` HTML. Wajib karena
	 * srcSet memakai deskriptor `w`: tanpa `sizes` browser menganggap gambar
	 * selebar 100vw dan selalu mengambil varian terbesar.
	 *
	 * Satuan viewport boleh dipakai di sini (yang dilarang spesifikasi hanya
	 * satuan relatif-font seperti `em`/`rem`) — berguna untuk hero yang dikunci
	 * lewat tinggi, yang lebarnya memang kelipatan `vh`.
	 */
	sizes: string;
	/** `high` untuk gambar LCP — lihat pemakainya di PublicPageHero dan Beranda. */
	fetchPriority?: "high" | "low" | "auto";
};

const srcSet = (varian: VarianGambar[]) => varian.map(({ url, lebar }) => `${url} ${lebar}w`).join(", ");

/**
 * `<picture>` avif → webp → png (varian statis digenerate saat build lewat
 * scripts/buatGambarResponsif.mjs, lihat komentar di sana) — dipakai untuk
 * ilustrasi hero dan foto anggota KPU; logo brand (sudah WebP kecil) tetap
 * `<img>` biasa.
 *
 * Deskriptor `w` + `sizes`, bukan `1x/2x`: lebar tampil gambar di sini tidak
 * pernah sama dengan `gambar.width` (hero ~300px CSS di ponsel, bukan 960),
 * jadi `2x` membuat browser mengunduh varian terbesar pada layar terkecil.
 */
export function ResponsiveImage({ gambar, alt, className, loading = "lazy", sizes, fetchPriority }: Props) {
	const height = Math.round((gambar.width / gambar.intrinsicWidth) * gambar.intrinsicHeight);

	return (
		<picture>
			<source type="image/avif" srcSet={srcSet(gambar.avif)} sizes={sizes} />
			<source type="image/webp" srcSet={srcSet(gambar.webp)} sizes={sizes} />
			<img
				src={gambar.png[0].url}
				srcSet={srcSet(gambar.png)}
				sizes={sizes}
				alt={alt}
				width={gambar.width}
				height={height}
				className={className}
				loading={loading}
				fetchPriority={fetchPriority}
			/>
		</picture>
	);
}
