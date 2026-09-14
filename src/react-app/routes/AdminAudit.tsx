import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

type Audit = {
	waktu: string;
	aktor: string;
	tindakan: string;
	sasaranUserId: string | null;
	sasaranBerkasId: string | null;
	hasil: string;
};

export function AdminAudit() {
	const [audit, setAudit] = useState<Audit[]>([]);
	const [pesan, setPesan] = useState("Memuat audit…");
	const [halaman, setHalaman] = useState(1);
	const [adaBerikutnya, setAdaBerikutnya] = useState(false);

	useEffect(() => {
		void fetch(`/api/admin/audit?halaman=${halaman}`)
			.then(async (response) => ({ response, body: await response.json() }))
			.then(({ response, body }) => {
				if (!response.ok) return setPesan("Audit tidak dapat dimuat.");
				setAudit(body.data);
				setAdaBerikutnya(body.adaBerikutnya);
				setPesan(body.data.length ? "" : "Belum ada catatan audit.");
			})
			.catch(() => setPesan("Audit tidak dapat dimuat."));
	}, [halaman]);

	return (
		<div className="flex flex-col gap-4">
			<div className="overflow-x-auto">
				<table className="w-full min-w-[42rem] text-left text-sm">
				<thead className="border-b-2 border-navy text-navy">
					<tr><th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Waktu</th><th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Aktor</th><th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Tindakan</th><th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Sasaran</th><th className="px-3 py-2 font-sans text-xs font-bold tracking-[0.08em] uppercase">Hasil</th></tr>
				</thead>
				<tbody>
					{pesan && <tr><td colSpan={5} className="px-3 py-6 text-muted-foreground" aria-live="polite">{pesan}</td></tr>}
					{audit.map((item) => (
						<tr key={`${item.waktu}-${item.tindakan}-${item.aktor}`} className="border-b border-border/70">
							<td className="px-3 py-3">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.waktu))}</td>
							<td className="px-3 py-3">{item.aktor}</td><td className="px-3 py-3">{item.tindakan}</td>
							<td className="px-3 py-3">{item.sasaranUserId ?? item.sasaranBerkasId ?? "—"}</td><td className="px-3 py-3">{item.hasil}</td>
						</tr>
					))}
				</tbody>
				</table>
			</div>
			<div className="flex items-center justify-between gap-3">
				<Button variant="outline" onClick={() => setHalaman((nilai) => nilai - 1)} disabled={halaman === 1}>Sebelumnya</Button>
				<p className="text-sm text-muted-foreground">Halaman {halaman}</p>
				<Button variant="outline" onClick={() => setHalaman((nilai) => nilai + 1)} disabled={!adaBerikutnya}>Berikutnya</Button>
			</div>
		</div>
	);
}
