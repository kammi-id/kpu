import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LABEL_TAHAP } from "~/react-app/lib/tahap";
import { useTahap } from "~/react-app/lib/useTahap";

type AkunDataApi = {
	name: string;
	whatsapp: string;
	email: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPd: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	instruktur: boolean | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
};

type FormState = {
	name: string;
	whatsapp: string;
	namaPanggilan: string;
	tempatLahir: string;
	tanggalLahir: string;
	asalPw: string;
	asalPd: string;
	tahunLulusDm3: string;
	tempatLulusDm3: string;
	instruktur: boolean;
	capaianHafalan: string;
	bahasaAsing: string;
};

const FORM_KOSONG: FormState = {
	name: "",
	whatsapp: "",
	namaPanggilan: "",
	tempatLahir: "",
	tanggalLahir: "",
	asalPw: "",
	asalPd: "",
	tahunLulusDm3: "",
	tempatLulusDm3: "",
	instruktur: false,
	capaianHafalan: "",
	bahasaAsing: "",
};

const PESAN_GALAT: Record<string, string> = {
	nama_wajib: "Nama lengkap wajib diisi.",
	whatsapp_tidak_valid: "Nomor WhatsApp tidak valid. Gunakan format 08…, +62…, atau 62….",
	whatsapp_sudah_dipakai: "Nomor WhatsApp ini sudah dipakai akun lain.",
	tanggal_lahir_tidak_valid: "Tanggal lahir bukan tanggal kalender yang sah.",
	tahun_lulus_tidak_valid: "Tahun lulus DM 3 harus antara 1998 dan 2026.",
	permintaan_tidak_valid: "Data tidak valid. Periksa kembali isian Anda.",
	tidak_berwenang: "Sesi telah berakhir. Silakan masuk kembali.",
	layanan_selesai: "Layanan telah selesai.",
};

function formDari(data: AkunDataApi): FormState {
	return {
		name: data.name ?? "",
		whatsapp: data.whatsapp ?? "",
		namaPanggilan: data.namaPanggilan ?? "",
		tempatLahir: data.tempatLahir ?? "",
		tanggalLahir: data.tanggalLahir ?? "",
		asalPw: data.asalPw ?? "",
		asalPd: data.asalPd ?? "",
		tahunLulusDm3: data.tahunLulusDm3 === null ? "" : String(data.tahunLulusDm3),
		tempatLulusDm3: data.tempatLulusDm3 ?? "",
		instruktur: data.instruktur === true,
		capaianHafalan: data.capaianHafalan ?? "",
		bahasaAsing: data.bahasaAsing ?? "",
	};
}

function kosongkeNull(nilai: string): string | null {
	const dipangkas = nilai.trim();
	return dipangkas === "" ? null : dipangkas;
}

export function AkunData() {
	const { data: tahap } = useTahap();
	const [email, setEmail] = useState("");
	const [form, setForm] = useState<FormState>(FORM_KOSONG);
	const [memuat, setMemuat] = useState(true);
	const [menyimpan, setMenyimpan] = useState(false);
	const [pesan, setPesan] = useState("");
	const [berhasil, setBerhasil] = useState(false);

	useEffect(() => {
		let dibatalkan = false;
		void fetch("/api/akun/data")
			.then((response) => (response.ok ? (response.json() as Promise<AkunDataApi>) : Promise.reject(new Error("gagal"))))
			.then((data) => {
				if (dibatalkan) return;
				setEmail(data.email);
				setForm(formDari(data));
			})
			.catch(() => {
				if (!dibatalkan) setPesan("Gagal memuat data. Muat ulang halaman.");
			})
			.finally(() => {
				if (!dibatalkan) setMemuat(false);
			});
		return () => {
			dibatalkan = true;
		};
	}, []);

	const bolehUbah = tahap ? tahap.bolehUbahBacalon : true;

	function ubah<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
		setForm((sebelumnya) => ({ ...sebelumnya, [kunci]: nilai }));
	}

	async function simpan(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMenyimpan(true);
		setPesan("");
		setBerhasil(false);

		const payload = {
			name: form.name.trim(),
			whatsapp: form.whatsapp.trim(),
			namaPanggilan: kosongkeNull(form.namaPanggilan),
			tempatLahir: kosongkeNull(form.tempatLahir),
			tanggalLahir: kosongkeNull(form.tanggalLahir),
			asalPw: kosongkeNull(form.asalPw),
			asalPd: kosongkeNull(form.asalPd),
			tahunLulusDm3: form.tahunLulusDm3.trim() === "" ? null : Number(form.tahunLulusDm3),
			tempatLulusDm3: kosongkeNull(form.tempatLulusDm3),
			instruktur: form.instruktur,
			capaianHafalan: kosongkeNull(form.capaianHafalan),
			bahasaAsing: kosongkeNull(form.bahasaAsing),
		};

		const response = await fetch("/api/akun/data", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		setMenyimpan(false);

		if (response.ok) {
			setBerhasil(true);
			return;
		}

		const body = ((await response.json().catch(() => ({}))) as { error?: string; tahap?: string }) ?? {};
		if (body.error === "tahap_tertutup" && body.tahap) {
			setPesan(`Data tidak dapat disimpan pada tahap ${LABEL_TAHAP[body.tahap as keyof typeof LABEL_TAHAP] ?? body.tahap}.`);
		} else {
			setPesan(body.error ? PESAN_GALAT[body.error] ?? "Data tidak dapat disimpan. Coba lagi." : "Data tidak dapat disimpan. Coba lagi.");
		}
	}

	if (memuat) return <p className="text-muted-foreground">Memuat data pribadi…</p>;

	return (
		<div className="max-w-2xl">
			<h2 className="font-display text-xl text-navy">Data pribadi</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Lengkapi data pribadi sesuai Formulir A.1. Perubahan tersimpan langsung tanpa perlu langkah kirim terpisah.
			</p>
			{!bolehUbah && tahap ? (
				<p className="mt-4 rounded-xl bg-muted p-4 text-sm text-navy">
					Formulir hanya-baca pada tahap {LABEL_TAHAP[tahap.tahap]}. Perubahan data hanya diterima pada Masa Pendaftaran dan Masa Perbaikan.
				</p>
			) : null}

			<form className="mt-5 flex flex-col gap-5" onSubmit={simpan}>
				<fieldset disabled={!bolehUbah || menyimpan} className="flex flex-col gap-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<label htmlFor="email" className="text-sm font-semibold text-navy">Email</label>
							<Input id="email" value={email} disabled readOnly />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="name" className="text-sm font-semibold text-navy">Nama lengkap</label>
							<Input id="name" value={form.name} onChange={(event) => ubah("name", event.target.value)} required />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="whatsapp" className="text-sm font-semibold text-navy">WhatsApp</label>
							<Input id="whatsapp" type="tel" inputMode="tel" placeholder="08… / +62… / 62…" value={form.whatsapp} onChange={(event) => ubah("whatsapp", event.target.value)} required />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="namaPanggilan" className="text-sm font-semibold text-navy">Nama panggilan</label>
							<Input id="namaPanggilan" value={form.namaPanggilan} onChange={(event) => ubah("namaPanggilan", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="tempatLahir" className="text-sm font-semibold text-navy">Tempat lahir</label>
							<Input id="tempatLahir" value={form.tempatLahir} onChange={(event) => ubah("tempatLahir", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="tanggalLahir" className="text-sm font-semibold text-navy">Tanggal lahir</label>
							<Input id="tanggalLahir" type="date" value={form.tanggalLahir} onChange={(event) => ubah("tanggalLahir", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="asalPw" className="text-sm font-semibold text-navy">Asal PW</label>
							<Input id="asalPw" value={form.asalPw} onChange={(event) => ubah("asalPw", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="asalPd" className="text-sm font-semibold text-navy">Asal PD</label>
							<Input id="asalPd" value={form.asalPd} onChange={(event) => ubah("asalPd", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="tahunLulusDm3" className="text-sm font-semibold text-navy">Tahun lulus DM 3</label>
							<Input id="tahunLulusDm3" type="number" inputMode="numeric" min={1998} max={2026} value={form.tahunLulusDm3} onChange={(event) => ubah("tahunLulusDm3", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="tempatLulusDm3" className="text-sm font-semibold text-navy">Tempat lulus DM 3</label>
							<Input id="tempatLulusDm3" value={form.tempatLulusDm3} onChange={(event) => ubah("tempatLulusDm3", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="capaianHafalan" className="text-sm font-semibold text-navy">Capaian hafalan</label>
							<Input id="capaianHafalan" value={form.capaianHafalan} onChange={(event) => ubah("capaianHafalan", event.target.value)} />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="bahasaAsing" className="text-sm font-semibold text-navy">Bahasa asing</label>
							<Input id="bahasaAsing" value={form.bahasaAsing} onChange={(event) => ubah("bahasaAsing", event.target.value)} />
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm font-semibold text-navy">
						<input type="checkbox" className="size-4" checked={form.instruktur} onChange={(event) => ubah("instruktur", event.target.checked)} />
						Berstatus instruktur
					</label>

					{pesan ? <p className="text-sm text-destructive" aria-live="polite">{pesan}</p> : null}
					{berhasil ? <p className="text-sm text-primary" aria-live="polite">Data tersimpan.</p> : null}

					<Button type="submit" disabled={!bolehUbah || menyimpan} className="self-start">
						{menyimpan ? "Menyimpan…" : "Simpan"}
					</Button>
				</fieldset>
			</form>
		</div>
	);
}
