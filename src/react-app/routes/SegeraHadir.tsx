/** Placeholder untuk rute yang tiketnya belum dikerjakan (mis. /peraturan, /daftar). */
export function SegeraHadir({ judul }: { judul: string }) {
	return (
		<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
			<h1 className="font-display text-3xl text-navy">{judul}</h1>
			<p className="mt-6 text-muted-foreground">Menyusul.</p>
		</section>
	);
}
