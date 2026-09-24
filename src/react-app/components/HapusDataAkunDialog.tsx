import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { hapusDataAkunAdmin } from "~/react-app/lib/adminBacalon";

export function HapusDataAkunDialog({ userId, nama, mintaDitutup }: { userId: string; nama: string; mintaDitutup: boolean }) {
	const navigate = useNavigate();
	const [terbuka, setTerbuka] = useState(false);
	const [mengirim, setMengirim] = useState(false);
	const [pesan, setPesan] = useState("");

	async function kirim(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMengirim(true);
		setPesan("");
		const password = String(new FormData(event.currentTarget).get("password") ?? "");
		try {
			await hapusDataAkunAdmin(userId, password);
			navigate("/admin", { replace: true });
		} catch (err) {
			setPesan(err instanceof Error ? err.message : "Hapus data akun gagal.");
		} finally {
			setMengirim(false);
		}
	}

	return (
		<Dialog open={terbuka} onOpenChange={(nilai) => { setTerbuka(nilai); if (!nilai) setPesan(""); }}>
			<DialogTrigger render={<Button variant="destructive" size="sm" />}>Hapus data akun</DialogTrigger>
			<DialogContent>
				<form onSubmit={kirim}>
					<DialogHeader>
						<DialogTitle>Hapus data akun {nama}</DialogTitle>
						<DialogDescription>
							Tindakan ini permanen: seluruh data D1, berkas R2, kedua ZIP ekspor, dan barisnya di
							kedua CSV akan dihapus. Masukkan kata sandi Admin Anda untuk mengonfirmasi.
						</DialogDescription>
					</DialogHeader>
					{mintaDitutup ? null : (
						<p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
							Bakal Calon ini tidak meminta penutupan akun. Setelah Masa Pendaftaran berakhir, orang ini
							tidak dapat membuat akun baru. Penghapusan ini bukan keputusan atas status pencalonan.
						</p>
					)}
					<fieldset className="mt-5 flex flex-col gap-2">
						<label htmlFor="password-hapus-data" className="font-semibold">Kata sandi Admin</label>
						<Input id="password-hapus-data" name="password" type="password" autoComplete="current-password" required autoFocus />
					</fieldset>
					{pesan ? <p className="mt-3 text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
					<DialogFooter className="mt-5">
						<Button type="submit" variant="destructive" disabled={mengirim}>
							{mengirim ? "Memproses…" : "Konfirmasi hapus data"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
