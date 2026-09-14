import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";

// `tentang.md` dibundel saat build (bukan diambil dari D1). Bila pemilik produk
// belum meng-commit-nya, glob ini kosong dan halaman menampilkan "Menyusul" —
// tidak ada perubahan kode yang dibutuhkan begitu berkasnya tersedia.
const berkas = import.meta.glob("../../content/tentang.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const isiTentang = Object.values(berkas)[0];

export function Tentang() {
	return (
		<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
			<h1 className="font-display text-3xl text-navy">Tentang KPU</h1>
			{isiTentang ? (
				<div className="mt-6">
					<SafeMarkdown>{isiTentang}</SafeMarkdown>
				</div>
			) : (
				<p className="mt-6 text-muted-foreground">Menyusul.</p>
			)}
		</section>
	);
}
