import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { type BerkasPublik, urlUnduhBerkasPublik } from "~/react-app/lib/berkasPublik";

function ukuranTerformat(byte: number) {
	return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
}

type Props = {
	judul: string;
	berkas: BerkasPublik[];
};

/**
 * Kartu unduhan berkas, dipakai di sidebar kanan atas /peraturan dan
 * /jadwal (tampilan besar) atau di atas konten utama (ponsel) — lihat
 * `PublicPageHero` untuk susunan grid pemanggilnya. Hanya berkasnya sendiri;
 * label adalah kepala kolom (DESIGN.md), bukan judul atau prosa tambahan.
 */
export function KartuUnduhanBerkas({ judul, berkas }: Props) {
	return (
		<div className="rounded-2xl border border-border bg-white p-5">
			<p className="text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">{judul}</p>
			{berkas.length > 0 ? (
				<ul className="mt-2 grid gap-4">
					{berkas.map((item) => (
						<li key={item.id}>
							<p className="break-all font-semibold text-navy">{item.namaAsli}</p>
							<p className="text-xs text-muted-foreground tabular-nums">{ukuranTerformat(item.ukuranByte)}</p>
							<Button render={<a href={urlUnduhBerkasPublik(item.id)} aria-label={`Unduh ${item.namaAsli}`} />} className="mt-2 w-full">
								<Download className="size-4" aria-hidden />
								Unduh
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-2 text-sm text-muted-foreground">Menyusul.</p>
			)}
		</div>
	);
}
