import { useEffect, useState } from "react";

const ALFABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TIK_MS = 42;
const TIK_DASAR = 6; // jumlah tik acak minimum sebelum ubin pertama (paling kiri) mengunci

function acak(): string {
	return ALFABET[Math.floor(Math.random() * ALFABET.length)];
}

/**
 * Ubin split-flap (DESIGN.md): satu ubin per huruf. Saat dimuat, setiap ubin
 * berputar acak lalu mengunci ke huruf akhirnya, ubin paling kiri mengunci
 * lebih dulu dan seterusnya ke kanan, ±42ms per tik. `prefers-reduced-motion`
 * membuatnya langsung statis. `aria-hidden` karena nama tahap yang sama juga
 * ditulis sebagai teks biasa untuk pembaca layar.
 */
export function SplitFlap({ teks }: { teks: string }) {
	const target = teks.toUpperCase().split("");
	const [kurangGerak] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [tampil, setTampil] = useState<string[]>(() => (kurangGerak ? target : target.map(() => acak())));

	useEffect(() => {
		if (kurangGerak) return;

		const huruf = teks.toUpperCase().split("");
		const kuncPada = huruf.map((_, index) => TIK_DASAR + index);
		const akhir = kuncPada[kuncPada.length - 1] ?? 0;

		let tik = 0;
		const interval = setInterval(() => {
			tik += 1;
			setTampil(huruf.map((karakterAkhir, index) => (tik >= kuncPada[index] ? karakterAkhir : acak())));
			if (tik >= akhir) clearInterval(interval);
		}, TIK_MS);

		return () => clearInterval(interval);
	}, [teks, kurangGerak]);

	return (
		<div aria-hidden className="@container flex flex-wrap gap-1">
			{tampil.map((karakter, index) => (
				<span
					key={index}
					className="relative flex h-[1.4em] w-[0.95em] shrink-0 items-center justify-center overflow-hidden rounded-[0.3rem] bg-marun font-display text-[clamp(1.5rem,7cqw,3.5rem)] leading-none text-white shadow-[inset_0_-0.2em_0_rgb(0_0_0_/_0.18)]"
				>
					{karakter === " " ? " " : karakter}
					<span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" />
				</span>
			))}
		</div>
	);
}
