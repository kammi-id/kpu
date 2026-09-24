import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { kelompokBerkas, type NomorKelompok } from "~/lib/kelompok";
import { cn } from "cn";

export type BerkasPratinjau = {
	id: string;
	kelompok: number;
	namaAsli: string;
	mime: string;
	/** Keterangan pendek di bawah nama, mis. jenis rekomendasi. */
	keterangan?: string;
	urlPratinjau: string;
	urlUnduh: string;
};

function labelKelompok(nomor: number) {
	return `Kelompok ${nomor}: ${kelompokBerkas(nomor as NomorKelompok).label}`;
}

/**
 * Pratinjau berkas Bakal Calon tanpa mengunduh. Dikendalikan induk lewat
 * `aktifId`: null berarti tertutup. Desktop: Sheet kanan hampir selebar layar
 * dengan daftar berkas per kelompok di kiri; ponsel: bottom sheet ~96vh dengan
 * dropdown berkas di atas pratinjau. Daftar dan navigasi hilang bila hanya satu berkas.
 */
export function PratinjauBerkasSheet({
	berkas,
	aktifId,
	onAktifChange,
}: {
	berkas: BerkasPratinjau[];
	aktifId: string | null;
	onAktifChange: (id: string | null) => void;
}) {
	const ponsel = useIsMobile();
	// Simpan id terakhir agar isi Sheet tidak kosong selama animasi tutup.
	const [terakhirId, setTerakhirId] = useState(aktifId);
	if (aktifId !== null && aktifId !== terakhirId) setTerakhirId(aktifId);
	const buka = aktifId !== null && berkas.some((item) => item.id === aktifId);
	const indeks = berkas.findIndex((item) => item.id === terakhirId);
	const aktif = indeks >= 0 ? berkas[indeks] : null;
	const banyak = berkas.length > 1;
	const kelompokUrut = [...new Set(berkas.map((item) => item.kelompok))];

	return (
		<Sheet open={buka} onOpenChange={(terbuka) => { if (!terbuka) onAktifChange(null); }}>
			<SheetContent
				side={ponsel ? "bottom" : "right"}
				className="gap-0 data-[side=bottom]:h-[96dvh] data-[side=bottom]:rounded-t-2xl data-[side=right]:w-[96vw] data-[side=right]:sm:max-w-[1400px]"
			>
				{aktif ? (
					<>
						<SheetHeader className="gap-3 border-b border-border p-4 pr-14 md:flex-row md:items-center md:justify-between md:p-5 md:pr-16">
							<div className="min-w-0">
								<SheetTitle className="truncate font-display text-lg text-navy">{aktif.namaAsli}</SheetTitle>
								<SheetDescription>
									{labelKelompok(aktif.kelompok)}
									{aktif.keterangan ? ` · ${aktif.keterangan}` : ""}
									{banyak ? ` · ${indeks + 1} dari ${berkas.length}` : ""}
								</SheetDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{banyak ? (
									<>
										<Button type="button" variant="outline" size="icon-sm" aria-label="Berkas sebelumnya" disabled={indeks === 0} onClick={() => onAktifChange(berkas[indeks - 1].id)}>
											<ChevronLeft aria-hidden />
										</Button>
										<Button type="button" variant="outline" size="icon-sm" aria-label="Berkas berikutnya" disabled={indeks === berkas.length - 1} onClick={() => onAktifChange(berkas[indeks + 1].id)}>
											<ChevronRight aria-hidden />
										</Button>
									</>
								) : null}
								<Button render={<a href={aktif.urlUnduh} />} variant="outline" size="sm">
									<Download aria-hidden />
									Unduh
								</Button>
								<Button render={<a href={aktif.urlPratinjau} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">
									<ExternalLink aria-hidden />
									Buka di tab baru
								</Button>
							</div>
						</SheetHeader>

						{banyak && ponsel ? (
							<div className="border-b border-border p-3">
								<label htmlFor="pilih-berkas-pratinjau" className="sr-only">Pilih berkas</label>
								<select
									id="pilih-berkas-pratinjau"
									value={aktif.id}
									onChange={(event) => onAktifChange(event.target.value)}
									className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
								>
									{kelompokUrut.map((nomor) => (
										<optgroup key={nomor} label={labelKelompok(nomor)}>
											{berkas.filter((item) => item.kelompok === nomor).map((item) => (
												<option key={item.id} value={item.id}>{item.namaAsli}{item.keterangan ? ` · ${item.keterangan}` : ""}</option>
											))}
										</optgroup>
									))}
								</select>
							</div>
						) : null}

						<div className="flex min-h-0 flex-1">
							{banyak && !ponsel ? (
								<nav aria-label="Daftar berkas" className="w-72 shrink-0 overflow-y-auto border-r border-border p-3">
									{kelompokUrut.map((nomor) => (
										<div key={nomor} className="mb-3 last:mb-0">
											<p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelKelompok(nomor)}</p>
											<ul className="flex flex-col gap-0.5">
												{berkas.filter((item) => item.kelompok === nomor).map((item) => (
													<li key={item.id}>
														<button
															type="button"
															aria-current={item.id === aktif.id ? "true" : undefined}
															onClick={() => onAktifChange(item.id)}
															className={cn(
																"w-full rounded-md px-2 py-1.5 text-left text-sm break-words hover:bg-muted",
																item.id === aktif.id && "bg-accent font-semibold text-navy hover:bg-accent",
															)}
														>
															{item.namaAsli}
															{item.keterangan ? <span className="block text-xs font-normal text-muted-foreground">{item.keterangan}</span> : null}
														</button>
													</li>
												))}
											</ul>
										</div>
									))}
								</nav>
							) : null}

							<div className="flex min-w-0 flex-1 items-center justify-center bg-muted/40">
								{aktif.mime.startsWith("image/") ? (
									<img key={aktif.id} src={aktif.urlPratinjau} alt={aktif.namaAsli} className="max-h-full max-w-full object-contain p-4" />
								) : (
									<iframe key={aktif.id} src={aktif.urlPratinjau} title={`Pratinjau ${aktif.namaAsli}`} className="size-full border-0" />
								)}
							</div>
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
