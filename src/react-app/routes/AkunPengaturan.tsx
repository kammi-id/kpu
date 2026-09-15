import { useEffect, useState } from "react";

type Pengaturan = { email: string; whatsapp: string; persetujuanVersi: string; persetujuanPada: string };

export function AkunPengaturan() {
	const [data, setData] = useState<Pengaturan | null>(null);
	useEffect(() => { void fetch("/api/akun/pengaturan").then((response) => response.json()).then(setData); }, []);
	if (!data) return <p className="text-muted-foreground">Memuat pengaturan…</p>;
	return (
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
	);
}
