import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import { ambilPeraturan, ambilUnduhan, type BerkasPublik } from "~/react-app/lib/berkasPublik";

const MAKS_UKURAN_BERKAS = 20 * 1024 * 1024;

function mimeDariNamaBerkas(namaAsli: string) {
	if (namaAsli.toLowerCase().endsWith(".pdf")) return "application/pdf";
	if (namaAsli.toLowerCase().endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	return null;
}

export function AdminPeraturan() {
	const [markdown, setMarkdown] = useState("");
	const [peraturan, setPeraturan] = useState<BerkasPublik[]>([]);
	const [formulir, setFormulir] = useState<BerkasPublik[]>([]);
	const [file, setFile] = useState<File | null>(null);
	const [pesan, setPesan] = useState("Memuat Peraturan…");
	const [menyimpan, setMenyimpan] = useState(false);

	async function muat() {
		const [dataPeraturan, dataUnduhan] = await Promise.all([ambilPeraturan(), ambilUnduhan()]);
		setMarkdown(dataPeraturan.isiMarkdown ?? "");
		setPeraturan(dataPeraturan.berkasPublik);
		setFormulir(dataUnduhan);
	}

	useEffect(() => {
		void muat().then(() => setPesan("")).catch(() => setPesan("Data Peraturan tidak dapat dimuat."));
	}, []);

	async function simpanMarkdown(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMenyimpan(true);
		setPesan("");
		try {
			const response = await fetch("/api/admin/peraturan", { method: "PUT", headers: { "content-type": "text/markdown" }, body: markdown });
			if (!response.ok) throw new Error();
			setPesan("Peraturan tersimpan.");
		} catch {
			setPesan("Peraturan tidak dapat disimpan.");
		} finally {
			setMenyimpan(false);
		}
	}

	function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
		const berikutnya = event.target.files?.[0] ?? null;
		if (berikutnya && berikutnya.size > MAKS_UKURAN_BERKAS) {
			setFile(null);
			setPesan("Berkas tidak boleh lebih dari 20 MiB.");
			return;
		}
		setFile(berikutnya);
	}

	async function unggah(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!file) return setPesan("Pilih berkas PDF atau DOCX terlebih dahulu.");
		const mime = mimeDariNamaBerkas(file.name);
		if (!mime) return setPesan("Berkas harus berupa PDF atau DOCX.");
		setMenyimpan(true);
		setPesan("");
		const data = new FormData(event.currentTarget);
		const query = new URLSearchParams({
			judul: String(data.get("judul") ?? ""), kategori: String(data.get("kategori") ?? ""),
			urutan: String(data.get("urutan") ?? ""), namaAsli: file.name,
		});
		try {
			const response = await fetch(`/api/admin/berkas-publik?${query}`, { method: "POST", headers: { "content-type": mime }, body: file });
			if (!response.ok) throw new Error();
			event.currentTarget.reset();
			setFile(null);
			await muat();
			setPesan("Berkas Publik tersimpan.");
		} catch {
			setPesan("Berkas tidak dapat diunggah. Pastikan PDF/DOCX, jenis berkas, dan ukuran sudah sesuai.");
		} finally {
			setMenyimpan(false);
		}
	}

	async function hapus(id: string) {
		setMenyimpan(true);
		setPesan("");
		try {
			const response = await fetch(`/api/admin/berkas-publik/${encodeURIComponent(id)}`, { method: "DELETE" });
			if (!response.ok) throw new Error();
			await muat();
			setPesan("Berkas Publik dihapus.");
		} catch {
			setPesan("Berkas tidak dapat dihapus.");
		} finally {
			setMenyimpan(false);
		}
	}

	return (
		<div className="grid gap-10">
			<div><h2 className="font-display text-3xl text-navy">Peraturan dan Berkas Publik</h2><p className="mt-2 text-muted-foreground">Kelola ringkasan PKPU, dokumen Peraturan, dan Formulir A.1–A.6.</p></div>
			{pesan ? <p className="text-sm text-muted-foreground" aria-live="polite">{pesan}</p> : null}
			<form className="grid gap-6 lg:grid-cols-2" onSubmit={simpanMarkdown}>
				<fieldset className="flex flex-col gap-2"><label htmlFor="isi-markdown" className="font-semibold text-navy">Ringkasan PKPU (Markdown)</label><textarea id="isi-markdown" name="isiMarkdown" value={markdown} onChange={(event) => setMarkdown(event.target.value)} maxLength={400000} className="min-h-80 w-full rounded-xl border border-input bg-white px-3 py-2 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" aria-describedby="batas-markdown" /><p id="batas-markdown" className="text-sm text-muted-foreground">{markdown.length.toLocaleString("id-ID")} / 400.000 karakter</p><Button type="submit" disabled={menyimpan}>{menyimpan ? "Menyimpan…" : "Simpan Peraturan"}</Button></fieldset>
				<section aria-labelledby="pratinjau-peraturan" className="rounded-2xl border border-border bg-white p-5"><h3 id="pratinjau-peraturan" className="font-display text-xl text-navy">Pratinjau</h3><div className="mt-4">{markdown ? <SafeMarkdown>{markdown}</SafeMarkdown> : <p className="text-muted-foreground">Menyusul.</p>}</div></section>
			</form>
			<form className="grid gap-4 rounded-2xl border border-border bg-white p-5" onSubmit={unggah}>
				<h3 className="font-display text-xl text-navy">Unggah Berkas Publik</h3>
				<div className="grid gap-4 sm:grid-cols-2"><fieldset className="flex flex-col gap-2"><label htmlFor="judul" className="font-semibold">Judul</label><Input id="judul" name="judul" required /></fieldset><fieldset className="flex flex-col gap-2"><label htmlFor="kategori" className="font-semibold">Kategori</label><select id="kategori" name="kategori" defaultValue="peraturan" className="h-10 rounded-xl border border-input bg-white px-3" required><option value="peraturan">Peraturan</option><option value="formulir">Formulir</option></select></fieldset><fieldset className="flex flex-col gap-2"><label htmlFor="urutan" className="font-semibold">Urutan</label><Input id="urutan" name="urutan" type="number" min="0" step="1" defaultValue="1" required /></fieldset><fieldset className="flex flex-col gap-2"><label htmlFor="berkas" className="font-semibold">Berkas PDF atau DOCX</label><Input id="berkas" name="berkas" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx" onChange={pilihBerkas} required /></fieldset></div>
				<Button type="submit" className="w-full sm:w-fit" disabled={menyimpan}>{menyimpan ? "Mengunggah…" : "Unggah Berkas"}</Button>
			</form>
			<section aria-labelledby="daftar-berkas"><h3 id="daftar-berkas" className="font-display text-2xl text-navy">Berkas tersimpan</h3><DaftarAdmin judul="Peraturan" berkas={peraturan} onHapus={hapus} disabled={menyimpan} /><DaftarAdmin judul="Formulir" berkas={formulir} onHapus={hapus} disabled={menyimpan} /></section>
		</div>
	);
}

function DaftarAdmin({ judul, berkas, onHapus, disabled }: { judul: string; berkas: BerkasPublik[]; onHapus: (id: string) => Promise<void>; disabled: boolean }) {
	return <section className="mt-5"><h4 className="font-semibold text-navy">{judul}</h4>{berkas.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Menyusul.</p> : <ul className="mt-2 divide-y divide-border rounded-xl border border-border">{berkas.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3"><span><span className="block font-medium">{item.judul}</span><span className="block text-sm text-muted-foreground">{item.namaAsli}</span></span><Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={() => void onHapus(item.id)}>Hapus</Button></li>)}</ul>}</section>;
}
