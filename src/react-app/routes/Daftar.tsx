import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "~/components/ui/badge";
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
	// Tiket 04 menggerbangi ulang NIA saat submit akhir — kode galat sama persis
	// dengan endpoint Cek NIA (lihat PESAN_GALAT_NIA di bawah).
	nia_format_tidak_valid: "NIA tidak valid. Tekan Reset dan periksa kembali.",
	nia_sudah_terdaftar: "NIA ini sudah terdaftar. Tekan Reset dan periksa kembali.",
	nia_tidak_ditemukan: "NIA tidak ditemukan. Tekan Reset dan periksa kembali.",
	nia_tidak_memenuhi_syarat: "NIA ini belum memenuhi syarat. Tekan Reset dan periksa kembali.",
	nia_gagal_upstream: "Sistem Keanggotaan KAMMI sedang tidak dapat dihubungi. Coba lagi.",
};

// Kode galat dari POST /api/nia/cek (tiket 03) — dipetakan lewat pesan yang
// membedakan format tidak valid, tidak ditemukan, sudah terdaftar, tidak
// memenuhi syarat, dan kegagalan upstream/jaringan (yang terakhir jelas
// mengundang coba lagi, bukan disamakan dengan NIA tidak valid).
const PESAN_GALAT_NIA: Record<string, string> = {
	nia_format_tidak_valid: "NIA harus berupa 11 digit angka.",
	nia_sudah_terdaftar: "NIA ini sudah terdaftar sebelumnya.",
	nia_tidak_ditemukan: "NIA tidak ditemukan di Sistem Keanggotaan KAMMI.",
	nia_tidak_memenuhi_syarat: "NIA ini belum memenuhi syarat keanggotaan (Anggota Biasa III aktif).",
	nia_gagal_upstream: "Sistem Keanggotaan KAMMI sedang tidak dapat dihubungi. Coba lagi.",
	turnstile_tidak_valid: "Verifikasi Turnstile gagal. Coba lagi.",
	terlalu_banyak_permintaan: "Terlalu banyak percobaan. Coba lagi nanti.",
	permintaan_tidak_valid: "NIA tidak valid.",
	layanan_tidak_tersedia: "Cek NIA sedang tidak tersedia. Coba lagi nanti.",
};

export function Daftar() {
	const navigate = useNavigate();
	const { data: tahap } = useTahap();
	const [tokenTurnstile, setTokenTurnstile] = useState<string | null>(null);
	const [pesan, setPesan] = useState("");
	const [mengirim, setMengirim] = useState(false);

	const [nia, setNia] = useState("");
	const [namaVerifikasi, setNamaVerifikasi] = useState<string | null>(null);
	const [niaTerverifikasi, setNiaTerverifikasi] = useState(false);
	const [tokenTurnstileNia, setTokenTurnstileNia] = useState<string | null>(null);
	const [pesanNia, setPesanNia] = useState("");
	const [mengecekNia, setMengecekNia] = useState(false);

	// Optimistis terbuka sebelum tahap termuat; server tetap menolak bila salah (registrasi_tidak_diizinkan).
	const bolehRegistrasi = tahap?.bolehRegistrasi ?? true;

	async function cekNia() {
		setMengecekNia(true);
		setPesanNia("");
		const response = await fetch("/api/nia/cek", {
			method: "POST",
			headers: { "content-type": "application/json", "x-captcha-response": tokenTurnstileNia ?? "" },
			body: JSON.stringify({ nia }),
		});
		setMengecekNia(false);
		const body = ((await response.json().catch(() => ({}))) as { nama?: string; error?: string }) ?? {};
		if (response.ok && body.nama) {
			setNamaVerifikasi(body.nama);
			setNiaTerverifikasi(true);
			return;
		}
		setPesanNia((body.error && PESAN_GALAT_NIA[body.error]) || "Cek NIA tidak dapat diproses. Coba lagi.");
	}

	// Reset eksplisit (tiket 06): hanya NIA + Nama lengkap yang dikosongkan dan
	// status validasi kembali ke belum terverifikasi — email/WhatsApp/kata
	// sandi/persetujuan yang sudah diisi user dipertahankan.
	function resetNia() {
		setNia("");
		setNamaVerifikasi(null);
		setNiaTerverifikasi(false);
		setPesanNia("");
		setTokenTurnstileNia(null);
	}

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
							<fieldset className="flex flex-col gap-2">
								<label htmlFor="nia" className="font-semibold">NIA (Nomor Induk Anggota)</label>
								<div className="flex gap-2">
									<Input
										id="nia"
										name="nia"
										inputMode="numeric"
										pattern="[0-9]{11}"
										maxLength={11}
										placeholder="11 digit"
										value={nia}
										readOnly={niaTerverifikasi}
										onChange={(event) => setNia(event.currentTarget.value.replace(/\D/g, "").slice(0, 11))}
										required
									/>
									{niaTerverifikasi ? (
										<Button type="button" variant="outline" onClick={resetNia}>Reset</Button>
									) : (
										<Button
											type="button"
											variant="secondary"
											onClick={() => void cekNia()}
											disabled={mengecekNia || nia.length !== 11 || !tokenTurnstileNia}
										>
											{mengecekNia ? "Memeriksa…" : "Cek NIA"}
										</Button>
									)}
								</div>
								{niaTerverifikasi ? <Badge variant="secondary">NIA terverifikasi</Badge> : null}
								{!niaTerverifikasi ? <Turnstile onToken={setTokenTurnstileNia} /> : null}
								{pesanNia ? <p className="text-sm text-destructive" aria-live="polite">{pesanNia}</p> : null}
							</fieldset>
							<fieldset className="flex flex-col gap-2">
								<label htmlFor="name" className="font-semibold">Nama lengkap</label>
								<Input id="name" name="name" value={namaVerifikasi ?? ""} readOnly placeholder="Terisi otomatis setelah NIA diverifikasi" required />
							</fieldset>
							<fieldset disabled={!niaTerverifikasi} className="flex flex-col gap-5">
								<fieldset className="flex flex-col gap-2"><label htmlFor="email" className="font-semibold">Email</label><Input id="email" name="email" type="email" autoComplete="username" required /></fieldset>
								<fieldset className="flex flex-col gap-2"><label htmlFor="whatsapp" className="font-semibold">WhatsApp</label><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08… / +62… / 62…" required /></fieldset>
								<fieldset className="flex flex-col gap-2"><label htmlFor="password" className="font-semibold">Kata sandi</label><p className="text-sm text-muted-foreground">Gunakan sedikitnya 8 karakter.</p><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></fieldset>
								<div className="max-h-64 overflow-y-auto rounded-xl bg-muted p-4"><SafeMarkdown>{isiPersetujuan}</SafeMarkdown></div>
								<label className="flex items-start gap-3 text-sm font-semibold text-navy"><input name="persetujuan" type="checkbox" value="true" className="mt-1 size-4" required />Saya telah membaca dan menyetujui Persetujuan Pemrosesan Data.</label>
								<Turnstile onToken={setTokenTurnstile} />
							</fieldset>
							{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
							<Button type="submit" disabled={mengirim || !bolehRegistrasi || !niaTerverifikasi}>{mengirim ? "Memproses…" : "Buat akun"}</Button>
						</fieldset>
					</form>
					<p className="mt-5 text-sm text-muted-foreground">Sudah memiliki akun? <Link className="font-semibold text-merah underline" to="/masuk">Masuk</Link></p>
				</CardContent>
			</Card>
		</section>
	);
}
