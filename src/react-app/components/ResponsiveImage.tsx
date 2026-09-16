import type { GambarResponsif } from "~/react-app/assets/generated";

export type { GambarResponsif };

type Props = {
	gambar: GambarResponsif;
	alt: string;
	className?: string;
	loading?: "lazy" | "eager";
};

/**
 * `<picture>` avif → webp → png (varian statis digenerate saat build lewat
 * scripts/buatGambarResponsif.mjs, lihat komentar di sana) — dipakai untuk
 * ilustrasi hero dan foto anggota KPU; logo brand (sudah WebP kecil) tetap
 * `<img>` biasa.
 */
export function ResponsiveImage({ gambar, alt, className, loading = "lazy" }: Props) {
	const height = Math.round((gambar.width / gambar.intrinsicWidth) * gambar.intrinsicHeight);

	return (
		<picture>
			<source type="image/avif" srcSet={`${gambar.avif.x1} 1x, ${gambar.avif.x2} 2x`} />
			<source type="image/webp" srcSet={`${gambar.webp.x1} 1x, ${gambar.webp.x2} 2x`} />
			<img
				src={gambar.png.x1}
				alt={alt}
				width={gambar.width}
				height={height}
				className={className}
				loading={loading}
			/>
		</picture>
	);
}
