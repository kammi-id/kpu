import { Trash2 } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";
import { Button } from "~/components/ui/button";
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
	kategori: "peraturan" | "formulir";
	judul: string;
	urutan: number;
	berkas: BerkasPublik[];
	onUbah: () => Promise<void>;
};

export function SlotBerkasPublik({ kategori, judul, urutan, berkas, onUbah }: Props) {
	const [menyimpan, setMenyimpan] = useState(false);
	const [pesan, setPesan] = useState("");
	const inputId = useId();

	async function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;
		setMenyimpan(true);
		setPesan("");
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
			if (berhasil > 0) await onUbah();
			setPesan(gagal > 0 ? `${berhasil} berhasil, ${gagal} gagal. ${alasan}` : "");
		} catch {
			setPesan("Daftar berkas tidak dapat dimuat ulang. Muat ulang halaman ini.");
		} finally {
			setMenyimpan(false);
		}
	}

	async function hapus(id: string) {
		setMenyimpan(true);
		setPesan("");
		try {
			await hapusBerkasPublik(id);
			await onUbah();
		} catch {
			setPesan("Berkas tidak dapat dihapus.");
		} finally {
			setMenyimpan(false);
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5">
			<div className="flex items-start justify-between gap-3">
				<h4 className="font-semibold text-navy">{judul}</h4>
				<StatusBadge terbuka={berkas.length > 0}>{berkas.length > 0 ? `${berkas.length} tersimpan` : "Belum ada"}</StatusBadge>
			</div>
			{berkas.length > 0 ? (
				<ul className="grid gap-3">
					{berkas.map((item) => (
						<li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
							<p className="min-w-0 break-all text-sm text-muted-foreground">{item.namaAsli} · {ukuranTerformat(item.ukuranByte)}</p>
							<div className="flex gap-2">
								<Button render={<a href={urlUnduhBerkasPublik(item.id)} aria-label={`Unduh ${item.namaAsli}`} />} type="button" variant="outline" size="sm">Unduh</Button>
								<Button type="button" variant="destructive" size="sm" aria-label={`Hapus ${item.namaAsli}`} disabled={menyimpan} onClick={() => void hapus(item.id)}>
									<Trash2 /> Hapus
								</Button>
							</div>
						</li>
					))}
				</ul>
			) : null}
			<div className="flex flex-col gap-2">
					<label htmlFor={inputId} className="sr-only">
						Unggah satu atau beberapa berkas {judul}
					</label>
					<Input
						id={inputId}
						type="file"
						multiple
						accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
						onChange={pilihBerkas}
						disabled={menyimpan}
					/>
					<p className="text-xs text-muted-foreground">Pilih satu atau beberapa PDF/DOCX, maksimum 20 MB per berkas.</p>
				</div>
			{pesan ? (
				<p className="text-sm text-marun" aria-live="polite">
					{pesan}
				</p>
			) : null}
		</div>
	);
}
