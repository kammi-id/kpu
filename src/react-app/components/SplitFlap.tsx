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

	// Dikelompokkan per kata (dipisah oleh spasi di `target`) supaya baris boleh
	// membungkus di antara kata, tetapi tidak pernah memutus satu kata di tengah
	// huruf. Spasi antarkata sendiri tidak dirender sebagai ubin, cukup gap CSS.
	const kataKeIndeks: number[][] = [[]];
	target.forEach((karakter, index) => {
		if (karakter === " ") {
			kataKeIndeks.push([]);
			return;
		}
		kataKeIndeks[kataKeIndeks.length - 1].push(index);
	});

	return (
		<div aria-hidden className="@container flex flex-wrap gap-x-3 gap-y-1">
			{kataKeIndeks
				.filter((kata) => kata.length > 0)
				.map((kata) => (
					<div key={kata[0]} className="flex flex-nowrap gap-1">
						{kata.map((index) => (
							<span
								key={index}
								className="relative flex h-[1.4em] w-[0.95em] shrink-0 items-center justify-center overflow-hidden rounded-[0.3rem] bg-marun font-display text-[clamp(1.5rem,7cqw,3.5rem)] leading-none text-white shadow-[inset_0_-0.2em_0_rgb(0_0_0_/_0.18)]"
							>
								{tampil[index]}
								<span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" />
							</span>
						))}
					</div>
				))}
		</div>
	);
}
