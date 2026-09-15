import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { ambilBacalonAdmin, type RingkasanBacalonAdmin } from "~/react-app/lib/adminBacalon";

function waktuTerformat(waktu: string) {
	return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(waktu));
}

export function AdminBeranda() {
	const [masukan, setMasukan] = useState("");
	const [pencarian, setPencarian] = useState("");
	const [daftar, setDaftar] = useState<RingkasanBacalonAdmin[]>([]);
	const [pesan, setPesan] = useState("Memuat data…");

	useEffect(() => {
		const controller = new AbortController();
		ambilBacalonAdmin(pencarian, controller.signal)
			.then((hasil) => {
				setDaftar(hasil);
				setPesan(hasil.length ? "" : "Belum ada Bakal Calon yang sesuai.");
			})
			.catch((err) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setPesan("Tabel Bakal Calon tidak dapat dimuat.");
			});
		return () => controller.abort();
	}, [pencarian]);

	function cari(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPencarian(masukan.trim());
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="font-display text-3xl text-navy">Bakal Calon</h2>
				<p className="mt-2 text-muted-foreground">Status Kelengkapan Berkas hanya menunjukkan berkas yang disyaratkan telah berada di sistem.</p>
			</div>
			<form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={cari} role="search">
				<label htmlFor="pencarian-bacalon" className="font-semibold">Cari nama</label>
				<Input id="pencarian-bacalon" name="q" value={masukan} onChange={(event) => setMasukan(event.target.value)} />
				<Button type="submit" variant="outline">Cari</Button>
			</form>
			<div className="overflow-x-auto rounded-xl border border-border bg-white">
				<table className="w-full min-w-[48rem] text-left text-sm">
					<thead className="border-b-2 border-navy text-navy">
						<tr>
							<th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Nama</th>
							<th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">WhatsApp</th>
							<th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Terdaftar</th>
							<th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Berkas</th>
							<th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Status</th>
							<th className="px-3 py-2"><span className="sr-only">Minta ditutup</span></th>
							<th className="px-3 py-2"><span className="sr-only">Buka detail</span></th>
						</tr>
					</thead>
					<tbody>
						{pesan ? <tr><td colSpan={7} className="px-3 py-6 text-muted-foreground" aria-live="polite">{pesan}</td></tr> : null}
						{daftar.map((item) => (
							<tr key={item.id} className="border-b border-border/70 last:border-0">
								<td className="px-3 py-3 font-medium text-navy">{item.name}</td>
								<td className="px-3 py-3">{item.whatsapp}</td>
								<td className="px-3 py-3">{waktuTerformat(item.dibuatPada)}</td>
								<td className="px-3 py-3">{item.jumlahHadir}/10</td>
								<td className="px-3 py-3"><StatusBadge terbuka={item.lengkap}>{item.lengkap ? "Lengkap" : "Belum lengkap"}</StatusBadge></td>
								<td className="px-3 py-3">{item.mintaDitutup ? <StatusBadge terbuka={false}>Minta ditutup</StatusBadge> : null}</td>
								<td className="px-3 py-3 text-right"><Link to={`/admin/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Detail</Link></td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
