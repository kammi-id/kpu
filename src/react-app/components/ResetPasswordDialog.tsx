import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { resetPasswordAdmin } from "~/react-app/lib/adminBacalon";

export function ResetPasswordDialog({ userId, nama }: { userId: string; nama: string }) {
	const [terbuka, setTerbuka] = useState(false);
	const [mengirim, setMengirim] = useState(false);
	const [pesan, setPesan] = useState("");
	const [kataSandiBaru, setKataSandiBaru] = useState("");
	const [disalin, setDisalin] = useState(false);

	function tutup(nilai: boolean) {
		setTerbuka(nilai);
		if (!nilai) {
			setPesan("");
			setKataSandiBaru("");
			setDisalin(false);
		}
	}

	async function kirim(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMengirim(true);
		setPesan("");
		const password = String(new FormData(event.currentTarget).get("password") ?? "");
		try {
			setKataSandiBaru(await resetPasswordAdmin(userId, password));
		} catch (err) {
			setPesan(err instanceof Error ? err.message : "Reset kata sandi gagal.");
		} finally {
			setMengirim(false);
		}
	}

	async function salin() {
		await navigator.clipboard.writeText(kataSandiBaru);
		setDisalin(true);
	}

	return (
		<Dialog open={terbuka} onOpenChange={tutup}>
			<DialogTrigger render={<Button variant="outline" size="sm" />}>Reset Password</DialogTrigger>
			<DialogContent>
				{kataSandiBaru ? (
					<>
						<DialogHeader>
							<DialogTitle>Kata sandi baru {nama}</DialogTitle>
							<DialogDescription>Catat sekarang — kata sandi ini hanya ditampilkan satu kali dan tidak dapat dilihat kembali.</DialogDescription>
						</DialogHeader>
						<div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3">
							<code className="flex-1 font-mono text-sm break-all">{kataSandiBaru}</code>
							<Button type="button" variant="outline" size="sm" onClick={() => void salin()}>{disalin ? "Tersalin" : "Salin"}</Button>
						</div>
						<DialogFooter>
							<Button type="button" onClick={() => tutup(false)}>Selesai</Button>
						</DialogFooter>
					</>
				) : (
					<form onSubmit={kirim}>
						<DialogHeader>
							<DialogTitle>Reset kata sandi {nama}</DialogTitle>
							<DialogDescription>Masukkan kata sandi Admin Anda untuk mengonfirmasi. Seluruh sesi {nama} akan dicabut.</DialogDescription>
						</DialogHeader>
						<fieldset className="mt-5 flex flex-col gap-2">
							<label htmlFor="password-konfirmasi" className="font-semibold">Kata sandi Admin</label>
							<Input id="password-konfirmasi" name="password" type="password" autoComplete="current-password" required autoFocus />
						</fieldset>
						{pesan ? <p className="mt-3 text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
						<DialogFooter className="mt-5">
							<Button type="submit" disabled={mengirim}>{mengirim ? "Memproses…" : "Konfirmasi reset"}</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
