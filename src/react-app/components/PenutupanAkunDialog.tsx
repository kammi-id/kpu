import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ajukanPenutupanAkun } from "~/react-app/lib/akunPengaturan";

export function PenutupanAkunDialog() {
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
			await ajukanPenutupanAkun(password);
			navigate("/masuk", { replace: true });
		} catch (err) {
			setPesan(err instanceof Error ? err.message : "Permintaan penutupan akun gagal.");
		} finally {
			setMengirim(false);
		}
	}

	return (
		<Dialog open={terbuka} onOpenChange={(nilai) => { setTerbuka(nilai); if (!nilai) setPesan(""); }}>
			<DialogTrigger render={<Button variant="destructive" />}>Ajukan Penutupan Akun</DialogTrigger>
			<DialogContent>
				<form onSubmit={kirim}>
					<DialogHeader>
						<DialogTitle>Permintaan Penutupan Akun dan Penarikan Persetujuan</DialogTitle>
						<DialogDescription>
							Akun Anda akan langsung terkunci dan seluruh sesi Anda dicabut. Permintaan ini{" "}
							<strong>tidak</strong> menetapkan status Mengundurkan Diri dan akan diproses KPU paling
							lambat 3×24 jam. Masukkan kata sandi Anda untuk mengonfirmasi.
						</DialogDescription>
					</DialogHeader>
					<fieldset className="mt-5 flex flex-col gap-2">
						<label htmlFor="password-penutupan" className="font-semibold">Kata sandi</label>
						<Input id="password-penutupan" name="password" type="password" autoComplete="current-password" required autoFocus />
					</fieldset>
					{pesan ? <p className="mt-3 text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
					<DialogFooter className="mt-5">
						<Button type="submit" variant="destructive" disabled={mengirim}>
							{mengirim ? "Memproses…" : "Konfirmasi penutupan"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
