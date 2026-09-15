import { useEffect, useState } from "react";
import { PenutupanAkunDialog } from "~/react-app/components/PenutupanAkunDialog";

type Pengaturan = { email: string; whatsapp: string; persetujuanVersi: string; persetujuanPada: string };

export function AkunPengaturan() {
	const [data, setData] = useState<Pengaturan | null>(null);
	useEffect(() => { void fetch("/api/akun/pengaturan").then((response) => response.json()).then(setData); }, []);
	if (!data) return <p className="text-muted-foreground">Memuat pengaturan…</p>;
	return (
		<div className="flex flex-col gap-8">
			<dl className="grid max-w-xl gap-4 rounded-xl bg-muted p-5 text-sm sm:grid-cols-2">
				<div>
					<dt className="font-semibold text-navy">Email</dt>
					<dd>{data.email}</dd>
				</div>
				<div>
					<dt className="font-semibold text-navy">WhatsApp</dt>
					<dd>{data.whatsapp}</dd>
				</div>
				<div>
					<dt className="font-semibold text-navy">Versi persetujuan</dt>
					<dd>{data.persetujuanVersi}</dd>
				</div>
				<div>
					<dt className="font-semibold text-navy">Waktu persetujuan</dt>
					<dd>
						{new Date(data.persetujuanPada).toLocaleString("id-ID", {
							dateStyle: "long",
							timeStyle: "short",
							timeZone: "Asia/Jakarta",
						})}{" "}
						WIB
					</dd>
				</div>
			</dl>
			<section aria-labelledby="penutupan-akun" className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
				<h3 id="penutupan-akun" className="font-display text-xl text-navy">Penutupan Akun dan Penarikan Persetujuan</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Mengajukan permintaan ini akan langsung mengunci akun Anda dan mencabut seluruh sesi. Permintaan
					ini <strong>tidak</strong> menetapkan status Mengundurkan Diri dan akan diproses KPU paling
					lambat 3×24 jam.
				</p>
				<div className="mt-4">
					<PenutupanAkunDialog />
				</div>
			</section>
		</div>
	);
}
