import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function Onboard() {
	const navigate = useNavigate();
	const [pesan, setPesan] = useState("");
	const [mengirim, setMengirim] = useState(false);

	async function kirim(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMengirim(true);
		setPesan("");
		const data = new FormData(event.currentTarget);
		const response = await fetch("/onboard", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(Object.fromEntries(data)),
		});
		setMengirim(false);
		if (response.ok) return navigate("/masuk", { replace: true });
		setPesan("Onboarding tidak dapat diproses. Periksa token dan isian, lalu coba lagi.");
	}

	return (
		<section className="w-full max-w-xl">
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="font-display text-2xl text-navy">Onboarding Admin</CardTitle>
					<CardDescription>Buat satu akun Admin bersama untuk KPU Muktamar XIV KAMMI.</CardDescription>
				</CardHeader>
				<CardContent>
					<form action="/onboard" method="post" className="flex flex-col gap-5" onSubmit={kirim}>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="token" className="font-semibold">Token onboarding</label>
							<Input id="token" name="token" type="password" autoComplete="one-time-code" required />
						</fieldset>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="name" className="font-semibold">Nama tampilan</label>
							<Input id="name" name="name" autoComplete="name" required />
						</fieldset>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="email" className="font-semibold">Email</label>
							<Input id="email" name="email" type="email" autoComplete="username" required />
						</fieldset>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="password" className="font-semibold">Kata sandi</label>
							<Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
							<p className="text-sm text-muted-foreground">Gunakan setidaknya 12 karakter.</p>
						</fieldset>
						{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
						<Button type="submit" disabled={mengirim}>{mengirim ? "Memproses…" : "Buat akun Admin"}</Button>
					</form>
				</CardContent>
				<CardFooter className="text-sm text-muted-foreground">Halaman ini hanya tersedia sebelum akun Admin dibuat.</CardFooter>
			</Card>
		</section>
	);
}
