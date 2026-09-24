import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { type NilaiComboboxSearchable, type OpsiCombobox, SearchableCombobox } from "~/components/ui/searchable-combobox";
import { mimeDariNamaBerkas, unggahBerkasKelompok } from "~/react-app/lib/akunBerkas";
import { LABEL_TAHAP } from "~/react-app/lib/tahap";
import { useTahap } from "~/react-app/lib/useTahap";

const TAHUN_SEKARANG = new Date().getUTCFullYear();

type NilaiStrukturApi = { id: string; label: string } | null;

type AkunDataApi = {
	name: string;
	whatsapp: string;
	email: string;
	nia: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPwId: string | null;
	asalPd: string | null;
	asalPdId: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	tempatLulusDm3Id: string | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
};

type EkstraksiApi = {
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: NilaiStrukturApi;
	asalPd: NilaiStrukturApi;
	tahunLulusDm3: number | null;
	tempatLulusDm3: NilaiStrukturApi;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
};

type FormState = {
	whatsapp: string;
	namaPanggilan: string;
	tempatLahir: string;
	tanggalLahir: string;
	asalPw: NilaiComboboxSearchable;
	asalPd: NilaiComboboxSearchable;
	tahunLulusDm3: string;
	tempatLulusDm3: NilaiComboboxSearchable;
	capaianHafalan: string;
	bahasaAsing: string;
};

const FORM_KOSONG: FormState = {
	whatsapp: "",
	namaPanggilan: "",
	tempatLahir: "",
	tanggalLahir: "",
	asalPw: "",
	asalPd: "",
	tahunLulusDm3: "",
	tempatLulusDm3: "",
	capaianHafalan: "",
	bahasaAsing: "",
};

const PESAN_GALAT: Record<string, string> = {
	nama_tidak_dapat_diubah: "Nama lengkap terkonfirmasi lewat Verifikasi NIA dan tidak dapat diubah dari sini.",
	whatsapp_tidak_valid: "Nomor WhatsApp tidak valid. Gunakan format 08…, +62…, atau 62….",
	whatsapp_sudah_dipakai: "Nomor WhatsApp ini sudah dipakai akun lain.",
	tanggal_lahir_tidak_valid: "Tanggal lahir bukan tanggal kalender yang sah.",
	tahun_lulus_tidak_valid: `Tahun lulus AB 3 harus antara 1998 dan ${TAHUN_SEKARANG}.`,
	permintaan_tidak_valid: "Data tidak valid. Periksa kembali isian Anda.",
	tidak_berwenang: "Sesi telah berakhir. Silakan masuk kembali.",
	layanan_selesai: "Layanan telah selesai.",
};

const PESAN_GALAT_EKSTRAKSI: Record<string, string> = {
	berkas_a1_tidak_ada: "Unggah Formulir A.1 (Berkas 1) terlebih dahulu di /akun/berkas.",
	berkas_tidak_terbaca: "Berkas A.1 tersimpan tidak dapat dibaca. Isi formulir secara manual.",
	ekstraksi_gagal: "Formulir A.1 tidak dapat dibaca otomatis saat ini. Isi formulir secara manual.",
};

const PESAN_GALAT_UNGGAH_A1 = "Formulir A.1 tidak dapat diunggah. Periksa format (PDF, JPEG, atau PNG) dan ukuran (maksimum 20 MB).";

function nilaiStruktur(label: string | null, id: string | null): NilaiComboboxSearchable {
	if (id !== null && label !== null) return { id, label };
	return label ?? "";
}

function formDari(data: AkunDataApi): FormState {
	return {
		whatsapp: data.whatsapp ?? "",
		namaPanggilan: data.namaPanggilan ?? "",
		tempatLahir: data.tempatLahir ?? "",
		tanggalLahir: data.tanggalLahir ?? "",
		asalPw: nilaiStruktur(data.asalPw, data.asalPwId),
		asalPd: nilaiStruktur(data.asalPd, data.asalPdId),
		tahunLulusDm3: data.tahunLulusDm3 === null ? "" : String(data.tahunLulusDm3),
		tempatLulusDm3: nilaiStruktur(data.tempatLulusDm3, data.tempatLulusDm3Id),
		capaianHafalan: data.capaianHafalan ?? "",
		bahasaAsing: data.bahasaAsing ?? "",
	};
}

function kosongkeNull(nilai: string): string | null {
	const dipangkas = nilai.trim();
	return dipangkas === "" ? null : dipangkas;
}

/** Combobox menyimpan `{id,label}` (dipilih) atau teks bebas (manual/kosong) — dipecah untuk payload PUT (tiket 22). */
function pisahkanStruktur(nilai: NilaiComboboxSearchable): { teks: string; id: string | null } {
	return typeof nilai === "string" ? { teks: nilai, id: null } : { teks: nilai.label, id: nilai.id };
}

function strukturKosong(nilai: NilaiComboboxSearchable): boolean {
	return typeof nilai === "string" && nilai.trim() === "";
}

async function ambilOpsiStruktur(jenis: "pw" | "pd", ancestor?: string): Promise<OpsiCombobox[]> {
	const query = jenis === "pd" && ancestor ? `?jenis=pd&ancestor=${encodeURIComponent(ancestor)}` : "?jenis=pw";
	const response = await fetch(`/api/struktur${query}`);
	if (!response.ok) return [];
	const data = (await response.json().catch(() => [])) as Array<{ id: string; nama: string }>;
	return Array.isArray(data) ? data.map((item) => ({ id: item.id, label: item.nama })) : [];
}

export function AkunData() {
	const { data: tahap } = useTahap();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [nia, setNia] = useState("");
	const [form, setForm] = useState<FormState>(FORM_KOSONG);
	const [memuat, setMemuat] = useState(true);
	const [menyimpan, setMenyimpan] = useState(false);
	const [pesan, setPesan] = useState("");
	const [berhasil, setBerhasil] = useState(false);

	const [opsiPw, setOpsiPw] = useState<OpsiCombobox[]>([]);
	const [opsiPd, setOpsiPd] = useState<OpsiCombobox[]>([]);
	const [kelompok1Hadir, setKelompok1Hadir] = useState(false);
	const [mengekstrak, setMengekstrak] = useState(false);
	const [mengunggahA1, setMengunggahA1] = useState(false);
	const [pesanEkstraksi, setPesanEkstraksi] = useState("");
	const inputA1Ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let dibatalkan = false;
		void fetch("/api/akun/data")
			.then((response) => (response.ok ? (response.json() as Promise<AkunDataApi>) : Promise.reject(new Error("gagal"))))
			.then((data) => {
				if (dibatalkan) return;
				setEmail(data.email);
				setName(data.name);
				setNia(data.nia);
				setForm(formDari(data));
			})
			.catch(() => {
				if (!dibatalkan) setPesan("Gagal memuat data. Muat ulang halaman.");
			})
			.finally(() => {
				if (!dibatalkan) setMemuat(false);
			});
		void ambilOpsiStruktur("pw").then((opsi) => {
			if (!dibatalkan) setOpsiPw(opsi);
		});
		void fetch("/api/akun/berkas")
			.then((response) => (response.ok ? response.json() : null))
			.then((data: { k1?: number } | null) => {
				if (!dibatalkan && data) setKelompok1Hadir(Boolean(data.k1));
			})
			.catch(() => undefined);
		return () => {
			dibatalkan = true;
		};
	}, []);

	// Asal PD terbatas pada Asal PW terpilih (tiket 22): daftar dimuat ulang
	// setiap kali Id PW berubah, dan dikosongkan begitu Asal PW bukan lagi
	// referensi struktur (dihapus atau diketik ulang jadi teks bebas).
	const asalPwId = typeof form.asalPw === "string" ? null : form.asalPw.id;
	useEffect(() => {
		if (!asalPwId) {
			setOpsiPd([]);
			return;
		}
		let dibatalkan = false;
		void ambilOpsiStruktur("pd", asalPwId).then((opsi) => {
			if (!dibatalkan) setOpsiPd(opsi);
		});
		return () => {
			dibatalkan = true;
		};
	}, [asalPwId]);

	const bolehUbah = tahap ? tahap.bolehUbahBacalon : true;

	function ubah<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
		setForm((sebelumnya) => ({ ...sebelumnya, [kunci]: nilai }));
	}

	function ubahAsalPw(nilai: NilaiComboboxSearchable) {
		setForm((sebelumnya) => ({ ...sebelumnya, asalPw: nilai, asalPd: "" }));
	}

	async function isiOtomatis() {
		setMengekstrak(true);
		setPesanEkstraksi("");
		try {
			const response = await fetch("/api/akun/data/isi-otomatis", { method: "POST" });
			if (!response.ok) {
				const body = ((await response.json().catch(() => ({}))) as { error?: string }) ?? {};
				setPesanEkstraksi(body.error ? PESAN_GALAT_EKSTRAKSI[body.error] ?? PESAN_GALAT_EKSTRAKSI.ekstraksi_gagal : PESAN_GALAT_EKSTRAKSI.ekstraksi_gagal);
				return;
			}
			const hasil = (await response.json()) as EkstraksiApi;
			setForm((sebelumnya) => ({
				...sebelumnya,
				namaPanggilan: sebelumnya.namaPanggilan === "" && hasil.namaPanggilan ? hasil.namaPanggilan : sebelumnya.namaPanggilan,
				tempatLahir: sebelumnya.tempatLahir === "" && hasil.tempatLahir ? hasil.tempatLahir : sebelumnya.tempatLahir,
				tanggalLahir: sebelumnya.tanggalLahir === "" && hasil.tanggalLahir ? hasil.tanggalLahir : sebelumnya.tanggalLahir,
				asalPw: strukturKosong(sebelumnya.asalPw) && hasil.asalPw ? { id: hasil.asalPw.id, label: hasil.asalPw.label } : sebelumnya.asalPw,
				asalPd: strukturKosong(sebelumnya.asalPd) && hasil.asalPd ? { id: hasil.asalPd.id, label: hasil.asalPd.label } : sebelumnya.asalPd,
				tahunLulusDm3: sebelumnya.tahunLulusDm3 === "" && hasil.tahunLulusDm3 !== null ? String(hasil.tahunLulusDm3) : sebelumnya.tahunLulusDm3,
				tempatLulusDm3:
					strukturKosong(sebelumnya.tempatLulusDm3) && hasil.tempatLulusDm3
						? { id: hasil.tempatLulusDm3.id, label: hasil.tempatLulusDm3.label }
						: sebelumnya.tempatLulusDm3,
				capaianHafalan: sebelumnya.capaianHafalan === "" && hasil.capaianHafalan ? hasil.capaianHafalan : sebelumnya.capaianHafalan,
				bahasaAsing: sebelumnya.bahasaAsing === "" && hasil.bahasaAsing ? hasil.bahasaAsing : sebelumnya.bahasaAsing,
			}));
		} catch {
			setPesanEkstraksi(PESAN_GALAT_EKSTRAKSI.ekstraksi_gagal);
		} finally {
			setMengekstrak(false);
		}
	}

	// Tombol A.1 berfungsi ganda: belum ada berkas kelompok 1 → buka pemilih
	// berkas dan unggah ke /akun/berkas/1 (menandai Berkas 1 hadir di halaman
	// berkas lewat endpoint yang sama), lalu langsung isi otomatis. Sudah ada →
	// isi otomatis langsung, seperti sebelumnya.
	function klikTombolA1() {
		if (kelompok1Hadir) {
			void isiOtomatis();
		} else {
			inputA1Ref.current?.click();
		}
	}

	async function unggahA1(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null;
		event.target.value = "";
		if (!file) return;

		const mime = mimeDariNamaBerkas(file.name);
		if (!mime) {
			setPesanEkstraksi(PESAN_GALAT_UNGGAH_A1);
			return;
		}

		setMengunggahA1(true);
		setPesanEkstraksi("");
		try {
			await unggahBerkasKelompok(1, file, mime);
			setKelompok1Hadir(true);
		} catch {
			setPesanEkstraksi(PESAN_GALAT_UNGGAH_A1);
			return;
		} finally {
			setMengunggahA1(false);
		}
		await isiOtomatis();
	}

	async function simpan(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMenyimpan(true);
		setPesan("");
		setBerhasil(false);

		const asalPw = pisahkanStruktur(form.asalPw);
		const asalPd = pisahkanStruktur(form.asalPd);
		const tempatLulusDm3 = pisahkanStruktur(form.tempatLulusDm3);

		const payload = {
			name,
			whatsapp: form.whatsapp.trim(),
			namaPanggilan: kosongkeNull(form.namaPanggilan),
			tempatLahir: kosongkeNull(form.tempatLahir),
			tanggalLahir: kosongkeNull(form.tanggalLahir),
			asalPw: kosongkeNull(asalPw.teks),
			asalPwId: asalPw.id,
			asalPd: kosongkeNull(asalPd.teks),
			asalPdId: asalPd.id,
			tahunLulusDm3: form.tahunLulusDm3.trim() === "" ? null : Number(form.tahunLulusDm3),
			tempatLulusDm3: kosongkeNull(tempatLulusDm3.teks),
			tempatLulusDm3Id: tempatLulusDm3.id,
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

			<Card className="mt-5">
				<CardHeader>
					<CardTitle>Identitas terkonfirmasi lewat Verifikasi NIA</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<p className="text-xs text-muted-foreground">Nama lengkap</p>
							<p className="font-semibold text-navy">{name}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">NIA</p>
							<p className="font-semibold text-navy">{nia}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="mt-5">
				<CardContent className="flex flex-col items-start gap-2">
					<input
						ref={inputA1Ref}
						type="file"
						className="hidden"
						accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
						onChange={(event) => void unggahA1(event)}
					/>
					<Button
						type="button"
						variant="secondary"
						disabled={!bolehUbah || menyimpan || mengunggahA1 || mengekstrak}
						onClick={klikTombolA1}
					>
						{mengunggahA1 ? "Mengunggah Formulir A.1…" : mengekstrak ? "Membaca Formulir A.1…" : kelompok1Hadir ? "Isi otomatis dari Formulir A.1" : "Unggah Formulir A.1"}
					</Button>
					{!kelompok1Hadir ? (
						<p className="text-xs text-muted-foreground">Belum ada Formulir A.1 tersimpan. Unggah di sini, atau di /akun/berkas (Berkas 1).</p>
					) : (
						<p className="text-xs text-muted-foreground">Hanya mengisi kolom yang masih kosong di bawah — nilai yang sudah diisi tidak ditimpa.</p>
					)}
					{pesanEkstraksi ? <p className="text-xs text-destructive" aria-live="polite">{pesanEkstraksi}</p> : null}
				</CardContent>
			</Card>

			<form className="mt-5 flex flex-col gap-5" onSubmit={simpan}>
				<fieldset disabled={!bolehUbah || menyimpan} className="flex flex-col gap-5">
					<Card>
						<CardHeader>
							<CardTitle>Kontak dan data pribadi</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<label htmlFor="email" className="text-sm font-semibold text-navy">Email</label>
								<Input id="email" value={email} disabled readOnly />
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
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Latar belakang KAMMI</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-2">
									<label htmlFor="asalPw" className="text-sm font-semibold text-navy">Asal PW</label>
									<SearchableCombobox id="asalPw" name="asalPw" options={opsiPw} value={form.asalPw} onValueChange={ubahAsalPw} placeholder="Cari PW KAMMI…" />
									{strukturKosong(form.asalPw) ? null : typeof form.asalPw === "string" ? (
										<Badge variant="outline">Tidak tercatat di struktur resmi, isi manual</Badge>
									) : null}
								</div>
								<div className="flex flex-col gap-2">
									<label htmlFor="asalPd" className="text-sm font-semibold text-navy">Asal PD</label>
									<SearchableCombobox
										id="asalPd"
										name="asalPd"
										options={opsiPd}
										value={form.asalPd}
										onValueChange={(nilai) => ubah("asalPd", nilai)}
										placeholder={asalPwId ? "Cari PD KAMMI…" : "Isi Asal PW terlebih dahulu"}
										disabled={!asalPwId}
									/>
									{strukturKosong(form.asalPd) ? null : typeof form.asalPd === "string" ? (
										<Badge variant="outline">Tidak tercatat di struktur resmi, isi manual</Badge>
									) : null}
								</div>
								<div className="flex flex-col gap-2">
									<label htmlFor="tahunLulusDm3" className="text-sm font-semibold text-navy">Tahun lulus AB 3</label>
									<Input id="tahunLulusDm3" type="number" inputMode="numeric" min={1998} max={TAHUN_SEKARANG} value={form.tahunLulusDm3} onChange={(event) => ubah("tahunLulusDm3", event.target.value)} />
								</div>
								<div className="flex flex-col gap-2">
									<label htmlFor="tempatLulusDm3" className="text-sm font-semibold text-navy">Tempat lulus AB 3</label>
									<SearchableCombobox
										id="tempatLulusDm3"
										name="tempatLulusDm3"
										options={opsiPw}
										value={form.tempatLulusDm3}
										onValueChange={(nilai) => ubah("tempatLulusDm3", nilai)}
										placeholder="Cari PW KAMMI…"
									/>
									{strukturKosong(form.tempatLulusDm3) ? null : typeof form.tempatLulusDm3 === "string" ? (
										<Badge variant="outline">Tidak tercatat di struktur resmi, isi manual</Badge>
									) : null}
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
						</CardContent>
					</Card>

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
