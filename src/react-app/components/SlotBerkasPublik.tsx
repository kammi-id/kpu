import { Trash2 } from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import {
	type BerkasPublik,
	hapusBerkasPublik,
	unggahBerkasPublik,
	urlUnduhBerkasPublik,
} from "~/react-app/lib/berkasPublik";

function ukuranTerformat(byte: number) {
	return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
}

type Props = {
	kategori: "peraturan" | "formulir" | "hasil-verifikasi";
	judul: string;
	urutan: number;
	berkas: BerkasPublik[];
	onUbah: () => Promise<BerkasPublik[]>;
};

export function SlotBerkasPublik({ kategori, judul, urutan, berkas, onUbah }: Props) {
	const [menyimpan, setMenyimpan] = useState(false);
	const [pesan, setPesan] = useState("");
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const slotRef = useRef<HTMLDivElement>(null);
	const [dialogTerbuka, setDialogTerbuka] = useState(false);
	const [pilihanHapus, setPilihanHapus] = useState<BerkasPublik | null>(null);
	const [pesanDialog, setPesanDialog] = useState("");

	async function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;
		setMenyimpan(true);
		setPesan("Mengunggah berkas…");
		try {
			let berhasil = 0;
			let gagal = 0;
			let alasan = "";
			for (const file of files) {
				try {
					await unggahBerkasPublik({ kategori, judul, urutan, file });
					berhasil += 1;
				} catch (error) {
					gagal += 1;
					if (!alasan) alasan = error instanceof Error ? error.message : "Berkas tidak dapat diunggah.";
				}
			}
			const terbaru = berhasil > 0 ? await onUbah() : null;
			setPesan(gagal > 0 ? `${berhasil} berhasil, ${gagal} gagal. ${alasan}` : kategori === "hasil-verifikasi" && terbaru?.[0] ? `Unggahan berhasil. PDF aktif di beranda: ${terbaru[0].namaAsli}.` : `${berhasil} berkas berhasil diunggah.`);
		} catch {
			setPesan("Unggahan berhasil, tetapi daftar belum dapat diperbarui. Klik Coba lagi untuk memastikan berkas aktif.");
		} finally {
			setMenyimpan(false);
		}
	}

	async function hapus() {
		if (!pilihanHapus || menyimpan) return;
		setMenyimpan(true);
		setPesanDialog("Menghapus berkas…");
		try {
			await hapusBerkasPublik(pilihanHapus.id);
		} catch {
			setPesanDialog("Berkas belum dapat dihapus. Coba lagi atau batalkan.");
			setMenyimpan(false);
			return;
		}
		setDialogTerbuka(false);
		setPesan("Berkas berhasil dihapus. Memperbarui daftar…");
		try {
			await onUbah();
			setPesan("Berkas berhasil dihapus dan daftar sudah diperbarui.");
		} catch {
			setPesan("Berkas berhasil dihapus, tetapi daftar belum dapat diperbarui. Klik Coba lagi.");
		} finally {
			setMenyimpan(false);
		}
	}

	const aktifDihapus = kategori === "hasil-verifikasi" && pilihanHapus?.id === berkas[0]?.id;
	const pengganti = berkas[1];

	return (
		<Dialog open={dialogTerbuka} onOpenChange={(terbuka) => { if (!menyimpan) setDialogTerbuka(terbuka); }}>
		<div ref={slotRef} tabIndex={-1} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5">
			<div className="flex items-start justify-between gap-3">
				<h4 className="font-semibold text-navy">{judul}</h4>
				<StatusBadge terbuka={berkas.length > 0}>{berkas.length > 0 ? `${berkas.length} tersimpan` : "Belum ada"}</StatusBadge>
			</div>
			{berkas.length > 0 ? (
				<ul className="grid gap-3">
					{berkas.map((item) => (
						<li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
							<p className="min-w-0 break-all text-sm text-muted-foreground">{kategori === "hasil-verifikasi" && item.id === berkas[0]?.id ? <span className="mr-2 font-semibold text-navy">Aktif di beranda</span> : null}{item.namaAsli} · {ukuranTerformat(item.ukuranByte)}</p>
							<div className="flex gap-2">
								<Button render={<a href={urlUnduhBerkasPublik(item.id)} aria-label={`Unduh ${item.namaAsli}`} />} type="button" variant="outline" size="sm" className="min-h-11">Unduh</Button>
								<DialogTrigger render={<Button type="button" variant="destructive" size="sm" className="min-h-11" disabled={menyimpan} />} aria-label={`Hapus ${item.namaAsli}`} onClick={() => { setPilihanHapus(item); setPesanDialog(""); }}>
									<Trash2 aria-hidden /> Hapus
								</DialogTrigger>
							</div>
						</li>
					))}
				</ul>
			) : null}
			<div className="flex flex-col gap-2">
					<label htmlFor={inputId} className="sr-only">
						Unggah {kategori === "hasil-verifikasi" ? "PDF" : "satu atau beberapa berkas"} {judul}
					</label>
					<Input
						id={inputId}
						ref={inputRef}
						className="h-11"
						type="file"
						multiple={kategori !== "hasil-verifikasi"}
						accept={kategori === "hasil-verifikasi" ? "application/pdf,.pdf" : "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"}
						onChange={pilihBerkas}
						disabled={menyimpan}
					/>
					<p className="text-xs text-muted-foreground">{kategori === "hasil-verifikasi" ? "Pilih satu PDF, maksimum 20 MB." : "Pilih satu atau beberapa PDF/DOCX, maksimum 20 MB per berkas."}</p>
				</div>
			<p className="text-sm text-marun" role="status" aria-live="polite" aria-atomic="true">{pesan}</p>
		</div>
		<DialogContent showCloseButton={false} finalFocus={() => inputRef.current?.matches(":disabled") ? slotRef.current : inputRef.current} className="max-h-[calc(100svh-2rem)] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Hapus berkas ini?</DialogTitle>
				<DialogDescription className="break-words">
					Berkas “{pilihanHapus?.namaAsli}” akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
					{aktifDihapus ? pengganti ? ` Beranda akan menggunakan PDF “${pengganti.namaAsli}”.` : " Beranda akan kembali menggunakan surat awal Pengumuman Hasil Verifikasi KPU Muktamar KAMMI." : kategori === "hasil-verifikasi" ? " PDF yang aktif di beranda tetap digunakan." : " Berkas ini tidak lagi tersedia untuk diunduh."}
				</DialogDescription>
			</DialogHeader>
			<p role="status" aria-live="polite" className="text-sm text-marun">{pesanDialog}</p>
			<DialogFooter>
				<Button type="button" variant="outline" className="min-h-11" disabled={menyimpan} onClick={() => setDialogTerbuka(false)}>Batal</Button>
				<Button type="button" variant="destructive" className="min-h-11" disabled={menyimpan} onClick={() => void hapus()}>{menyimpan ? "Menghapus…" : "Hapus permanen"}</Button>
			</DialogFooter>
		</DialogContent>
		</Dialog>
	);
}
