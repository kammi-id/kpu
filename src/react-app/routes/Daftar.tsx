import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import { Turnstile } from "~/react-app/components/Turnstile";

// `persetujuan-v1.md` dibundel saat build, sama seperti `tentang.md` (tiket 07).
const berkasPersetujuan = import.meta.glob("../../content/persetujuan-v1.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const isiPersetujuan = Object.values(berkasPersetujuan)[0] ?? "";

export function Daftar() {
	const navigate = useNavigate();
	const [tokenTurnstile, setTokenTurnstile] = useState<string | null>(null);
	const [pesan, setPesan] = useState("");
	const [mengirim, setMengirim] = useState(false);

	async function kirim(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMengirim(true);
		setPesan("");
		const data = Object.fromEntries(new FormData(event.currentTarget));
		const response = await fetch("/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json", "x-captcha-response": tokenTurnstile ?? "" },
			body: JSON.stringify(data),
		});
		setMengirim(false);
		if (response.ok) return navigate("/akun", { replace: true });
		setPesan("Pendaftaran tidak dapat diproses. Periksa isian dan verifikasi Turnstile, lalu coba lagi.");
	}

	return (
		<section className="mx-auto flex max-w-[42rem] px-4 py-10 sm:px-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="font-display text-2xl text-navy">Daftar Bakal Calon Ketua Umum</CardTitle>
					<CardDescription>Buat akun selama Masa Pendaftaran.</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-5" onSubmit={kirim}>
						<fieldset className="flex flex-col gap-2"><label htmlFor="name" className="font-semibold">Nama lengkap</label><Input id="name" name="name" autoComplete="name" required /></fieldset>
						<fieldset className="flex flex-col gap-2"><label htmlFor="email" className="font-semibold">Email</label><Input id="email" name="email" type="email" autoComplete="username" required /></fieldset>
						<fieldset className="flex flex-col gap-2"><label htmlFor="whatsapp" className="font-semibold">WhatsApp</label><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08… / +62… / 62…" required /></fieldset>
						<fieldset className="flex flex-col gap-2"><label htmlFor="password" className="font-semibold">Kata sandi</label><p className="text-sm text-muted-foreground">Gunakan sedikitnya 8 karakter.</p><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></fieldset>
						<div className="max-h-64 overflow-y-auto rounded-xl bg-muted p-4"><SafeMarkdown>{isiPersetujuan}</SafeMarkdown></div>
						<label className="flex items-start gap-3 text-sm font-semibold text-navy"><input name="persetujuan" type="checkbox" value="true" className="mt-1 size-4" required />Saya telah membaca dan menyetujui Persetujuan Pemrosesan Data.</label>
						<Turnstile onToken={setTokenTurnstile} />
						{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
						<Button type="submit" disabled={mengirim}>{mengirim ? "Memproses…" : "Buat akun"}</Button>
					</form>
					<p className="mt-5 text-sm text-muted-foreground">Sudah memiliki akun? <Link className="font-semibold text-merah underline" to="/masuk">Masuk</Link></p>
				</CardContent>
			</Card>
		</section>
	);
}
