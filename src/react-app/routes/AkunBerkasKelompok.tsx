import { Download, Lock } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { kelompokBerkas, kelompokValid, type NomorKelompok } from "~/lib/kelompok";
import { ambilBerkasKelompok, mimeDariNamaBerkas, unggahBerkasKelompok, urlPratinjauBerkas, urlUnduhBerkas, type BerkasItem, type JenisRekomendasi } from "~/react-app/lib/akunBerkas";
import { ambilUnduhan, urlUnduhBerkasPublik, type BerkasPublik } from "~/react-app/lib/berkasPublik";
import { PratinjauBerkasSheet } from "~/react-app/components/PratinjauBerkasSheet";
import { PENJELASAN_TAHAP } from "~/react-app/lib/tahap";
import { useTahap } from "~/react-app/lib/useTahap";

function ukuranTerformat(byte: number) {
	return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
}

const LABEL_JENIS_REKOMENDASI: Record<JenisRekomendasi, string> = {
	A3_PW: "A.3 dari PW",
	A4_PD: "A.4 dari PD",
};

export function AkunBerkasKelompok() {
	const { no } = useParams();
	const nomorMentah = Number(no);
	const { data: tahap } = useTahap();
	const [daftar, setDaftar] = useState<BerkasItem[] | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [jenisRekomendasi, setJenisRekomendasi] = useState<JenisRekomendasi>("A3_PW");
	const [pesan, setPesan] = useState("");
	const [menyimpan, setMenyimpan] = useState(false);
	const [templat, setTemplat] = useState<BerkasPublik[] | null>(null);
	const [pratinjauId, setPratinjauId] = useState<string | null>(null);

	const kelompok = kelompokValid(nomorMentah) ? kelompokBerkas(nomorMentah as NomorKelompok) : null;

	async function muat(nomor: number) {
		try {
			setDaftar(await ambilBerkasKelompok(nomor));
		} catch {
			setPesan("Berkas tidak dapat dimuat.");
		}
	}

	useEffect(() => {
		if (!kelompok) return;
		setDaftar(null);
		void muat(kelompok.nomor);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [kelompok?.nomor]);

	// Templat Berkas Publik (/unduhan) yang relevan untuk kelompok ini — sama
	// untuk semua kelompok, jadi cukup dimuat sekali dan disaring per kelompok.
	useEffect(() => {
		let dibatalkan = false;
		void ambilUnduhan()
			.then((data) => {
				if (!dibatalkan) setTemplat(data);
			})
			.catch(() => undefined);
		return () => {
			dibatalkan = true;
		};
	}, []);

	if (!kelompok) {
		return <p className="text-marun">Kelompok berkas tidak ditemukan.</p>;
	}

	const templatKelompok = templat?.filter((item) => kelompok.templat.includes(item.judul)) ?? [];

	const bolehUbah = tahap?.bolehUbahBacalon ?? false;

	function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
		setFile(event.target.files?.[0] ?? null);
	}

	async function unggah(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!kelompok) return;
		if (!file) {
			setPesan("Pilih berkas terlebih dahulu.");
			return;
		}
		const mime = mimeDariNamaBerkas(file.name);
		if (!mime) {
			setPesan(`Berkas harus berupa ${kelompok.hanyaPdf ? "PDF" : "PDF, JPEG, atau PNG"}.`);
			return;
		}
		// Disimpan sebelum await: event.currentTarget sudah null begitu fetch selesai,
		// karena dispatch event native sudah berakhir saat itu.
		const form = event.currentTarget;
		setMenyimpan(true);
		setPesan("");
		try {
			await unggahBerkasKelompok(kelompok.nomor, file, mime, kelompok.nomor === 7 ? jenisRekomendasi : undefined);
			form.reset();
			setFile(null);
			await muat(kelompok.nomor);
			setPesan("Berkas tersimpan.");
		} catch {
			setPesan("Berkas tidak dapat diunggah. Periksa format, ukuran (maksimum 20 MB), dan batas lima berkas per kelompok.");
		} finally {
			setMenyimpan(false);
		}
	}

	async function hapus(id: string) {
		if (!kelompok) return;
		setMenyimpan(true);
		setPesan("");
		try {
			const response = await fetch(`/api/akun/berkas/${kelompok.nomor}/${encodeURIComponent(id)}`, { method: "DELETE" });
			if (!response.ok) throw new Error();
			await muat(kelompok.nomor);
			setPesan("Berkas dihapus.");
		} catch {
			setPesan("Berkas tidak dapat dihapus.");
		} finally {
			setMenyimpan(false);
		}
	}

	return (
		<div className="grid gap-6">
			<div>
				<h2 className="font-display text-3xl text-navy">
					Berkas {kelompok.nomor}: {kelompok.label}
				</h2>
				<p className="mt-2 text-muted-foreground">{kelompok.ketentuanFormat}</p>
				{kelompok.catatan ? <p className="mt-1 text-sm text-muted-foreground">{kelompok.catatan}</p> : null}
			</div>

			{templatKelompok.length > 0 ? (
				<div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3">
					<span className="text-sm text-muted-foreground">Templat:</span>
					{templatKelompok.map((item) => (
						<Button key={item.id} render={<a href={urlUnduhBerkasPublik(item.id)} />} type="button" variant="outline" size="sm">
							<Download className="size-4" aria-hidden />
							{item.judul}
						</Button>
					))}
				</div>
			) : null}

			{pesan ? (
				<p className="text-sm text-marun" aria-live="polite">
					{pesan}
				</p>
			) : null}

			<form className="grid gap-4 rounded-2xl border border-border bg-white p-5" onSubmit={unggah}>
				{kelompok.nomor === 7 ? (
					<fieldset className="flex flex-col gap-2">
						<label htmlFor="jenisRekomendasi" className="font-semibold">
							Asal rekomendasi
						</label>
						<select
							id="jenisRekomendasi"
							value={jenisRekomendasi}
							onChange={(event) => setJenisRekomendasi(event.target.value as JenisRekomendasi)}
							disabled={!bolehUbah}
							className="h-10 rounded-xl border border-input bg-white px-3"
						>
							<option value="A3_PW">{LABEL_JENIS_REKOMENDASI.A3_PW}</option>
							<option value="A4_PD">{LABEL_JENIS_REKOMENDASI.A4_PD}</option>
						</select>
					</fieldset>
				) : null}
				<fieldset className="flex flex-col gap-2">
					<label htmlFor="berkas" className="font-semibold">
						Berkas {kelompok.hanyaPdf ? "PDF" : "PDF, JPEG, atau PNG"}
					</label>
					<Input
						id="berkas"
						type="file"
						accept={kelompok.hanyaPdf ? "application/pdf,.pdf" : "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"}
						onChange={pilihBerkas}
						disabled={!bolehUbah}
						required
					/>
				</fieldset>
				{bolehUbah ? (
					<Button type="submit" className="w-full sm:w-fit" disabled={menyimpan}>
						{menyimpan ? "Mengunggah…" : "Unggah Berkas"}
					</Button>
				) : (
					<div>
						{/* Tombol ditutup tahap (DESIGN.md): tetap tampil dan dapat difokus,
						    arsiran diagonal, terhubung ke alasan tertulis di bawahnya. */}
						<Button
							type="submit"
							disabled
							focusableWhenDisabled
							aria-describedby="alasan-berkas-tertutup"
							className="w-full bg-[repeating-linear-gradient(135deg,var(--muted)_0_7px,var(--accent)_7px_14px)] text-marun/70 shadow-none hover:bg-[repeating-linear-gradient(135deg,var(--muted)_0_7px,var(--accent)_7px_14px)] sm:w-fit"
						>
							<Lock className="size-5" aria-hidden />
							Unggah Berkas
						</Button>
						{tahap ? (
							<p id="alasan-berkas-tertutup" className="mt-2 text-sm text-marun">
								{PENJELASAN_TAHAP[tahap.tahap]}
							</p>
						) : null}
					</div>
				)}
			</form>

			<section aria-labelledby="daftar-berkas-kelompok">
				<h3 id="daftar-berkas-kelompok" className="font-display text-xl text-navy">
					Berkas tersimpan
				</h3>
				{daftar === null ? (
					<p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
				) : daftar.length === 0 ? (
					<p className="mt-2 text-sm text-muted-foreground">Belum ada berkas di kelompok ini.</p>
				) : (
					<ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
						{daftar.map((item) => (
							<li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
								<span>
									<button type="button" onClick={() => setPratinjauId(item.id)} className="block text-left font-medium underline-offset-4 hover:underline">{item.namaAsli}</button>
									<span className="block text-sm text-muted-foreground">
										{ukuranTerformat(item.ukuranByte)}
										{item.jenisRekomendasi ? ` · ${LABEL_JENIS_REKOMENDASI[item.jenisRekomendasi]}` : ""}
									</span>
								</span>
								<span className="flex gap-2">
									<Button type="button" variant="outline" size="sm" onClick={() => setPratinjauId(item.id)}>
										Pratinjau
									</Button>
									<Button render={<a href={urlUnduhBerkas(kelompok.nomor, item.id)} />} type="button" variant="outline" size="sm">
										Unduh
									</Button>
									<Button type="button" variant="destructive" size="sm" disabled={menyimpan || !bolehUbah} onClick={() => void hapus(item.id)}>
										Hapus
									</Button>
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
			{daftar ? (
				<PratinjauBerkasSheet
					berkas={daftar.map((item) => ({
						id: item.id,
						kelompok: kelompok.nomor,
						namaAsli: item.namaAsli,
						mime: item.mime,
						keterangan: item.jenisRekomendasi ? LABEL_JENIS_REKOMENDASI[item.jenisRekomendasi] : undefined,
						urlPratinjau: urlPratinjauBerkas(kelompok.nomor, item.id),
						urlUnduh: urlUnduhBerkas(kelompok.nomor, item.id),
					}))}
					aktifId={pratinjauId}
					onAktifChange={setPratinjauId}
				/>
			) : null}
		</div>
	);
}
