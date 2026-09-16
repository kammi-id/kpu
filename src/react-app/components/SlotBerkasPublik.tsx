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
	berkas: BerkasPublik | undefined;
	onUbah: () => Promise<void>;
};

/**
 * Satu kolom = satu berkas bernama tetap (mis. "Formulir A.1"). Tidak ada
 * penggantian dalam satu langkah: Hapus mengosongkan kolom, baru kolom kosong
 * menerima unggahan baru — menghindari dua baris berjudul sama di database.
 */
export function SlotBerkasPublik({ kategori, judul, urutan, berkas, onUbah }: Props) {
	const [menyimpan, setMenyimpan] = useState(false);
	const [pesan, setPesan] = useState("");
	const inputId = useId();

	async function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setMenyimpan(true);
		setPesan("");
		try {
			await unggahBerkasPublik({ kategori, judul, urutan, file });
			await onUbah();
		} catch (error) {
			setPesan(error instanceof Error ? error.message : "Berkas tidak dapat diunggah.");
		} finally {
			setMenyimpan(false);
		}
	}

	async function hapus() {
		if (!berkas) return;
		setMenyimpan(true);
		setPesan("");
		try {
			await hapusBerkasPublik(berkas.id);
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
				<StatusBadge terbuka={Boolean(berkas)}>{berkas ? "Tersimpan" : "Belum ada"}</StatusBadge>
			</div>
			{berkas ? (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-muted-foreground">
						{berkas.namaAsli} · {ukuranTerformat(berkas.ukuranByte)}
					</p>
					<div className="flex gap-2">
						<Button render={<a href={urlUnduhBerkasPublik(berkas.id)} />} type="button" variant="outline" size="sm">
							Unduh
						</Button>
						<Button type="button" variant="destructive" size="sm" disabled={menyimpan} onClick={() => void hapus()}>
							<Trash2 />
							Hapus
						</Button>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					<label htmlFor={inputId} className="sr-only">
						Unggah {judul}
					</label>
					<Input
						id={inputId}
						type="file"
						accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
						onChange={pilihBerkas}
						disabled={menyimpan}
					/>
					<p className="text-xs text-muted-foreground">PDF atau DOCX, maksimum 20 MB.</p>
				</div>
			)}
			{pesan ? (
				<p className="text-sm text-marun" aria-live="polite">
					{pesan}
				</p>
			) : null}
		</div>
	);
}
