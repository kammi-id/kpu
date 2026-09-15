import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Turnstile } from "~/react-app/components/Turnstile";

export function Masuk() {
	const navigate = useNavigate();
	const [pesan, setPesan] = useState("");
	const [mengirim, setMengirim] = useState(false);
	const [perluTurnstile, setPerluTurnstile] = useState(false);
	const [tokenTurnstile, setTokenTurnstile] = useState<string | null>(null);

	async function kirim(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMengirim(true);
		setPesan("");
		const data = Object.fromEntries(new FormData(event.currentTarget));
		const response = await fetch("/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json", "x-captcha-response": tokenTurnstile ?? "" },
			body: JSON.stringify(data),
		});
		setMengirim(false);
		if (response.ok) {
			const body = await response.json() as { user?: { role?: string } };
			return navigate(body.user?.role === "admin" ? "/admin" : "/akun", { replace: true });
		}
		const body = await response.json().catch(() => null) as { turnstileDiperlukan?: boolean } | null;
		if (body?.turnstileDiperlukan) setPerluTurnstile(true);
		setPesan("Email atau kata sandi tidak sesuai.");
	}

	return (
		<section className="mx-auto flex max-w-[30rem] px-4 py-10 sm:px-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="font-display text-2xl text-navy">Masuk</CardTitle>
					<CardDescription>Gunakan kredensial akun Anda.</CardDescription>
				</CardHeader>
				<CardContent>
					<form action="/api/auth/sign-in/email" method="post" className="flex flex-col gap-5" onSubmit={kirim}>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="email" className="font-semibold">Email</label>
							<Input id="email" name="email" type="email" autoComplete="username" required />
						</fieldset>
						<fieldset className="flex flex-col gap-2">
							<label htmlFor="password" className="font-semibold">Kata sandi</label>
							<Input id="password" name="password" type="password" autoComplete="current-password" required />
						</fieldset>
						{perluTurnstile ? <Turnstile onToken={setTokenTurnstile} /> : null}
						{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
						<Button type="submit" disabled={mengirim}>{mengirim ? "Memeriksa…" : "Masuk"}</Button>
					</form>
					<p className="mt-5 text-sm text-muted-foreground">Lupa kata sandi? Hubungi kanal resmi KPU di <a className="font-semibold text-merah underline" href="/tentang">/tentang</a>.</p>
				</CardContent>
			</Card>
		</section>
	);
}
