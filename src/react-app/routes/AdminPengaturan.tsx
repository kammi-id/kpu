import { useEffect, useState } from "react";
import { Switch } from "~/components/ui/switch";

type Pengaturan = { pendaftaranDitutupManual: boolean };

export function AdminPengaturan() {
	const [data, setData] = useState<Pengaturan | null>(null);
	const [menyimpan, setMenyimpan] = useState(false);
	const [galat, setGalat] = useState(false);

	useEffect(() => {
		void fetch("/api/admin/pengaturan")
			.then((response) => response.json())
			.then(setData)
			.catch(() => setGalat(true));
	}, []);

	async function ubah(ditutup: boolean) {
		setMenyimpan(true);
		setGalat(false);
		try {
			const response = await fetch("/api/admin/pengaturan", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ pendaftaranDitutupManual: ditutup }),
			});
			if (!response.ok) throw new Error();
			setData(await response.json());
		} catch {
			setGalat(true);
		} finally {
			setMenyimpan(false);
		}
	}

	return (
		<div className="flex flex-col gap-8">
			<h2 className="font-display text-3xl text-navy">Pengaturan</h2>
			<section aria-labelledby="penutupan-pendaftaran" className="max-w-xl rounded-xl border border-border bg-white p-5">
				<h3 id="penutupan-pendaftaran" className="font-display text-xl text-navy">Penutupan Pendaftaran Manual</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Menutup pendaftaran akun baru kapan pun selama Masa Pendaftaran berlangsung, terlepas dari
					jadwalnya. Sakelar ini hanya dapat menutup — tidak pernah membuka pendaftaran di luar Masa
					Pendaftaran yang terjadwal.
				</p>
				{!data ? (
					<p className="mt-4 text-sm text-muted-foreground">Memuat pengaturan…</p>
				) : (
					<label className="mt-4 flex items-center gap-3 text-sm font-semibold text-navy">
						<Switch
							checked={data.pendaftaranDitutupManual}
							onCheckedChange={(ditutup: boolean) => void ubah(ditutup)}
							disabled={menyimpan}
						/>
						{data.pendaftaranDitutupManual ? "Pendaftaran ditutup manual" : "Pendaftaran mengikuti jadwal"}
					</label>
				)}
				{galat ? <p className="mt-3 text-sm text-destructive" aria-live="polite">Gagal menyimpan. Coba lagi.</p> : null}
			</section>
		</div>
	);
}
