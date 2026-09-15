import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { MarkdownEditor } from "~/react-app/components/MarkdownEditor";
import { ambilPeraturan } from "~/react-app/lib/berkasPublik";

export function AdminPeraturan() {
	const [markdown, setMarkdown] = useState("");
	const [pesan, setPesan] = useState("Memuat Peraturan…");
	const [menyimpan, setMenyimpan] = useState(false);

	async function muat() {
		const data = await ambilPeraturan();
		setMarkdown(data.isiMarkdown ?? "");
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

	return (
		<div className="grid gap-10">
			<div>
				<h2 className="font-display text-3xl text-navy">Peraturan</h2>
				<p className="mt-2 text-muted-foreground">Kelola ringkasan PKPU yang tampil di halaman publik /peraturan.</p>
			</div>
			{pesan ? <p className="text-sm text-muted-foreground" aria-live="polite">{pesan}</p> : null}
			<form className="flex flex-col gap-3" onSubmit={simpanMarkdown}>
				<label htmlFor="isi-markdown" className="font-semibold text-navy">Ringkasan PKPU</label>
				<MarkdownEditor
					value={markdown}
					onChange={setMarkdown}
					placeholder="Tulis ringkasan PKPU…"
					className="h-[70svh] min-h-112"
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p id="batas-markdown" className="text-sm text-muted-foreground">
						{markdown.length.toLocaleString("id-ID")} / 400.000 karakter
					</p>
					<Button type="submit" disabled={menyimpan}>{menyimpan ? "Menyimpan…" : "Simpan Peraturan"}</Button>
				</div>
			</form>
		</div>
	);
}
