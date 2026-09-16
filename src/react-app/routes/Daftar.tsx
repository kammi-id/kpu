import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { SafeMarkdown } from "~/react-app/components/SafeMarkdown";
import { Turnstile } from "~/react-app/components/Turnstile";
import { alasanPendaftaranTertutup } from "~/react-app/lib/tahap";
import { useTahap } from "~/react-app/lib/useTahap";

// `persetujuan-v1.md` dibundel saat build, sama seperti `tentang.md` (tiket 07).
const berkasPersetujuan = import.meta.glob("../../content/persetujuan-v1.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const isiPersetujuan = Object.values(berkasPersetujuan)[0] ?? "";

// Alasan penolakan nyata dari POST /api/auth/sign-up/email (src/worker/index.ts) — jangan
// menyalahkan Turnstile/isian saat penyebab sebenarnya adalah tahap yang tertutup.
const PESAN_GALAT: Record<string, string> = {
	registrasi_tidak_diizinkan: "Pendaftaran akun baru hanya dapat dibuat pada Masa Pendaftaran.",
	registrasi_tidak_valid: "Data tidak valid. Periksa nama, WhatsApp, dan persetujuan yang dicentang.",
	registrasi_gagal: "Email atau nomor WhatsApp ini sudah dipakai akun lain.",
	permintaan_tidak_valid: "Data tidak valid. Periksa kembali isian Anda.",
};

export function Daftar() {
	const navigate = useNavigate();
	const { data: tahap } = useTahap();
	const [tokenTurnstile, setTokenTurnstile] = useState<string | null>(null);
	const [pesan, setPesan] = useState("");
	const [mengirim, setMengirim] = useState(false);

	// Optimistis terbuka sebelum tahap termuat; server tetap menolak bila salah (registrasi_tidak_diizinkan).
	const bolehRegistrasi = tahap?.bolehRegistrasi ?? true;

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
		if (response.ok) return navigate("/bacalon", { replace: true });
		const body = ((await response.json().catch(() => ({}))) as { error?: string }) ?? {};
		setPesan((body.error && PESAN_GALAT[body.error]) || "Pendaftaran tidak dapat diproses. Coba lagi.");
	}

	return (
		<section className="w-full max-w-2xl">
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="font-display text-2xl text-navy">Daftar Bakal Calon Ketua Umum</CardTitle>
					<CardDescription>Buat akun selama Masa Pendaftaran.</CardDescription>
				</CardHeader>
				<CardContent>
					{!bolehRegistrasi && tahap ? (
						<p className="mb-5 rounded-xl bg-muted p-4 text-sm text-navy">{alasanPendaftaranTertutup(tahap)}</p>
					) : null}
					<form className="flex flex-col gap-5" onSubmit={kirim}>
						<fieldset disabled={!bolehRegistrasi || mengirim} className="flex flex-col gap-5">
							<fieldset className="flex flex-col gap-2"><label htmlFor="name" className="font-semibold">Nama lengkap</label><Input id="name" name="name" autoComplete="name" required /></fieldset>
							<fieldset className="flex flex-col gap-2"><label htmlFor="email" className="font-semibold">Email</label><Input id="email" name="email" type="email" autoComplete="username" required /></fieldset>
							<fieldset className="flex flex-col gap-2"><label htmlFor="whatsapp" className="font-semibold">WhatsApp</label><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08… / +62… / 62…" required /></fieldset>
							<fieldset className="flex flex-col gap-2"><label htmlFor="password" className="font-semibold">Kata sandi</label><p className="text-sm text-muted-foreground">Gunakan sedikitnya 8 karakter.</p><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></fieldset>
							<div className="max-h-64 overflow-y-auto rounded-xl bg-muted p-4"><SafeMarkdown>{isiPersetujuan}</SafeMarkdown></div>
							<label className="flex items-start gap-3 text-sm font-semibold text-navy"><input name="persetujuan" type="checkbox" value="true" className="mt-1 size-4" required />Saya telah membaca dan menyetujui Persetujuan Pemrosesan Data.</label>
							<Turnstile onToken={setTokenTurnstile} />
							{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
							<Button type="submit" disabled={mengirim || !bolehRegistrasi}>{mengirim ? "Memproses…" : "Buat akun"}</Button>
						</fieldset>
					</form>
					<p className="mt-5 text-sm text-muted-foreground">Sudah memiliki akun? <Link className="font-semibold text-merah underline" to="/masuk">Masuk</Link></p>
				</CardContent>
			</Card>
		</section>
	);
}
