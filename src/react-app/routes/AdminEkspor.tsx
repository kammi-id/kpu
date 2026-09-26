import { buttonVariants } from "~/components/ui/button";
import { urlEksporCsv } from "~/react-app/lib/adminBacalon";

export function AdminEkspor() {
	return (
		<div className="flex flex-col gap-8">
			<h2 className="font-display text-3xl text-navy">Ekspor Harian</h2>
			<section aria-labelledby="ekspor-terkini" className="rounded-xl border border-border bg-white p-5">
				<h3 id="ekspor-terkini" className="font-display text-xl text-navy">Terkini</h3>
				<p className="mt-1 text-muted-foreground">Dibuat ulang tiap hari. Diganti setiap Ekspor Harian berjalan.</p>
				<a href={urlEksporCsv("terkini")} className={`${buttonVariants({ variant: "outline" })} mt-3`}>Unduh CSV Terkini</a>
			</section>
			<section aria-labelledby="ekspor-pemeriksaan" className="rounded-xl border border-border bg-white p-5">
				<h3 id="ekspor-pemeriksaan" className="font-display text-xl text-navy">Pemeriksaan</h3>
				<p className="mt-1 text-muted-foreground">Snapshot awal pemeriksaan 1 Oktober 2026, dibuat sekali dan tidak pernah ditimpa.</p>
				<a href={urlEksporCsv("pemeriksaan")} className={`${buttonVariants({ variant: "outline" })} mt-3`}>Unduh CSV Pemeriksaan</a>
			</section>
		</div>
	);
}
