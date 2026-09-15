import { Footer } from "~/react-app/components/Footer";
import { PENJELASAN_TAHAP } from "~/react-app/lib/tahap";

/** Tahap Selesai (tiket 18): satu-satunya isi seluruh situs setelah Penghapusan Akhir. */
export function SelesaiPage() {
	return (
		<div className="flex min-h-svh flex-col">
			<main className="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-8">
				<h1 className="max-w-xl font-display text-3xl text-navy">{PENJELASAN_TAHAP.Selesai}</h1>
			</main>
			<Footer />
		</div>
	);
}
