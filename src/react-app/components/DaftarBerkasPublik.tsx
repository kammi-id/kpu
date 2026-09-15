import { Download } from "lucide-react";
import type { BerkasPublik } from "~/react-app/lib/berkasPublik";
import { urlUnduhBerkasPublik } from "~/react-app/lib/berkasPublik";

export function DaftarBerkasPublik({ berkas }: { berkas: BerkasPublik[] }) {
	if (berkas.length === 0) return <p className="text-muted-foreground">Menyusul.</p>;

	return (
		<ul className="divide-y divide-border rounded-2xl border border-border bg-white">
			{berkas.map((item) => (
				<li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
					<div>
						<p className="font-semibold text-navy">{item.judul}</p>
						<p className="text-sm text-muted-foreground">{item.namaAsli}</p>
					</div>
					<a
						href={urlUnduhBerkasPublik(item.id)}
						className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-merah px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_0_var(--marun)] hover:bg-merah-tua"
					>
						<Download className="size-4" aria-hidden />
						Unduh
					</a>
				</li>
			))}
		</ul>
	);
}
