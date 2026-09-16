type Props = {
	src: string;
	alt: string;
	/** Lebar tampil 1x; retina (2x) dihitung otomatis. Harus salah satu dari daftar
	 * `LEBAR_DIIZINKAN` di src/worker/routes/gambar.ts (480/960/1600) — endpoint
	 * `/img` menolak lebar lain. */
	width: 480 | 960;
	/** Dimensi asli berkas sumber (bukan ukuran tampil) — dipakai menghitung
	 * atribut `height` HTML dari `width` di atas, supaya browser bisa
	 * mencadangkan ruang tata letak untuk `<img loading="lazy">` tanpa CLS. */
	intrinsicWidth: number;
	intrinsicHeight: number;
	className?: string;
	loading?: "lazy" | "eager";
};

function urlGambar(src: string, w: number, fmt: "avif" | "webp" | "original") {
	return `/img?src=${encodeURIComponent(src)}&w=${w}&fmt=${fmt}`;
}

// Bukan sekadar `width * 2`: endpoint `/img` hanya menerima 480/960/1600
// (lihat LEBAR_DIIZINKAN di gambar.ts), jadi pasangan retina dipetakan
// eksplisit ke anggota daftar itu, bukan dihitung.
const LEBAR_RETINA: Record<480 | 960, 1600 | 960> = { 480: 960, 960: 1600 };

/**
 * `<picture>` avif → webp → asli (PNG diresize, bukan berkas mentah) lewat
 * endpoint `/img` (Cloudflare Images binding, di-cache immutable) — lihat
 * plan gambar responsif. Dipakai untuk ilustrasi hero dan foto anggota KPU;
 * logo brand (sudah WebP kecil) tetap `<img>` biasa.
 */
export function ResponsiveImage({ src, alt, width, intrinsicWidth, intrinsicHeight, className, loading = "lazy" }: Props) {
	const w2x = LEBAR_RETINA[width];
	const srcSet = (fmt: "avif" | "webp") => `${urlGambar(src, width, fmt)} 1x, ${urlGambar(src, w2x, fmt)} 2x`;
	const height = Math.round((width / intrinsicWidth) * intrinsicHeight);

	return (
		<picture>
			<source type="image/avif" srcSet={srcSet("avif")} />
			<source type="image/webp" srcSet={srcSet("webp")} />
			<img
				src={urlGambar(src, width, "original")}
				alt={alt}
				width={width}
				height={height}
				className={className}
				loading={loading}
			/>
		</picture>
	);
}
