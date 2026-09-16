import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { type BerkasPublik, urlUnduhBerkasPublik } from "~/react-app/lib/berkasPublik";

function ukuranTerformat(byte: number) {
	return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
}

type Props = {
	judul: string;
	berkas: BerkasPublik | undefined;
};

/**
 * Kartu unduhan satu berkas, dipakai di sidebar kanan atas /peraturan dan
 * /jadwal (tampilan besar) atau di atas konten utama (ponsel) — lihat
 * `PublicPageHero` untuk susunan grid pemanggilnya. Hanya berkasnya sendiri;
 * label adalah kepala kolom (DESIGN.md), bukan judul atau prosa tambahan.
 */
export function KartuUnduhanBerkas({ judul, berkas }: Props) {
	return (
		<div className="rounded-2xl border border-border bg-white p-5">
			<p className="text-[0.8125rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">{judul}</p>
			{berkas ? (
				<div className="mt-2">
					<p className="truncate font-semibold text-navy">{berkas.namaAsli}</p>
					<p className="text-xs text-muted-foreground tabular-nums">{ukuranTerformat(berkas.ukuranByte)}</p>
					<Button render={<a href={urlUnduhBerkasPublik(berkas.id)} />} className="mt-3 w-full">
						<Download className="size-4" aria-hidden />
						Unduh
					</Button>
				</div>
			) : (
				<p className="mt-2 text-sm text-muted-foreground">Menyusul.</p>
			)}
		</div>
	);
}
