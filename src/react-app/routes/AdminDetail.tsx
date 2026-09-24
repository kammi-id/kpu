import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { KELOMPOK_BERKAS } from "~/lib/kelompok";
import { HapusDataAkunDialog } from "~/react-app/components/HapusDataAkunDialog";
import { PratinjauBerkasSheet, type BerkasPratinjau } from "~/react-app/components/PratinjauBerkasSheet";
import { ResetPasswordDialog } from "~/react-app/components/ResetPasswordDialog";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { ambilDetailBacalonAdmin, urlEksporZip, urlPratinjauAdmin, urlUnduhAdmin, type DetailBacalonAdmin } from "~/react-app/lib/adminBacalon";

const LABEL_REKOMENDASI = { A3_PW: "A.3 dari PW", A4_PD: "A.4 dari PD" } as const;

function nilai(nilai: string | number | null, manual?: boolean) {
	if (nilai === null) return "—";
	if (manual) {
		return (
			<span className="inline-flex items-center gap-2">
				<span>{nilai}</span>
				<Badge variant="outline" className="text-xs">Manual</Badge>
			</span>
		);
	}
	return nilai;
}

export function AdminDetail() {
	const { id } = useParams();
	const [data, setData] = useState<DetailBacalonAdmin | null | undefined>(undefined);
	const [pesan, setPesan] = useState("Memuat detail…");
	const [pratinjauId, setPratinjauId] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		const controller = new AbortController();
		ambilDetailBacalonAdmin(id, controller.signal)
			.then((hasil) => {
				setData(hasil);
				setPesan(hasil ? "" : "Bakal Calon tidak ditemukan.");
			})
			.catch((err) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setPesan("Detail Bakal Calon tidak dapat dimuat.");
			});
		return () => controller.abort();
	}, [id]);

	if (!data) return <p className="text-muted-foreground" aria-live="polite">{pesan}</p>;

	const dataPribadi: Array<[string, string | number | null, boolean?]> = [
		["Nama lengkap", data.name], ["NIA", data.nia], ["Email", data.email], ["WhatsApp", data.whatsapp], ["Nama panggilan", data.namaPanggilan],
		["Tempat lahir", data.tempatLahir], ["Tanggal lahir", data.tanggalLahir],
		["Asal PW", data.asalPw, data.asalPwManual],
		["Asal PD", data.asalPd, data.asalPdManual],
		["Tahun lulus AB 3", data.tahunLulusDm3],
		["Tempat lulus AB 3", data.tempatLulusDm3, data.tempatLulusDm3Manual],
		["Capaian hafalan", data.capaianHafalan], ["Bahasa asing", data.bahasaAsing],
	];
	// Urutan sama dengan daftar di halaman: per kelompok 1..9, sehingga Sebelumnya/Berikutnya menelusuri urutan yang dilihat Admin.
	const berkasPratinjau: BerkasPratinjau[] = KELOMPOK_BERKAS.flatMap((kelompok) => data.berkas.filter((item) => item.kelompok === kelompok.nomor)).map((item) => ({
		id: item.id,
		kelompok: item.kelompok,
		namaAsli: item.namaAsli,
		mime: item.mime,
		keterangan: item.jenisRekomendasi ? LABEL_REKOMENDASI[item.jenisRekomendasi] : undefined,
		urlPratinjau: urlPratinjauAdmin(data.id, item.id),
		urlUnduh: urlUnduhAdmin(data.id, item.id),
	}));

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div><h2 className="font-display text-3xl text-navy">{data.name}</h2><p className="mt-2 text-muted-foreground">Status Kelengkapan Berkas: {data.jumlahHadir}/{KELOMPOK_BERKAS.length}</p></div>
				<div className="flex items-center gap-3">
					<StatusBadge terbuka={data.lengkap}>{data.lengkap ? "Lengkap" : "Belum lengkap"}</StatusBadge>
					{data.mintaDitutup ? <StatusBadge terbuka={false}>Minta ditutup</StatusBadge> : null}
					<ResetPasswordDialog userId={data.id} nama={data.name} />
					<HapusDataAkunDialog userId={data.id} nama={data.name} mintaDitutup={data.mintaDitutup} />
				</div>
			</div>
			<section aria-labelledby="ekspor-akun">
				<h3 id="ekspor-akun" className="font-display text-xl text-navy">Ekspor akun</h3>
				<div className="mt-3 flex flex-wrap gap-3">
					<a href={urlEksporZip(data.id, "terkini")} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh ZIP Terkini</a>
					<a href={urlEksporZip(data.id, "pemeriksaan")} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh ZIP Pemeriksaan</a>
				</div>
			</section>
			<section aria-labelledby="data-pribadi"><h3 id="data-pribadi" className="font-display text-xl text-navy">Data pribadi</h3><dl className="mt-3 grid gap-x-8 gap-y-3 rounded-xl border border-border bg-white p-5 sm:grid-cols-2">{dataPribadi.map(([label, isi, manual]) => <div key={label}><dt className="text-sm font-semibold text-muted-foreground">{label}</dt><dd className="mt-1">{nilai(isi, manual)}</dd></div>)}</dl></section>
			<section aria-labelledby="kelompok-berkas"><h3 id="kelompok-berkas" className="font-display text-xl text-navy">Sembilan kelompok berkas</h3><div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white">{KELOMPOK_BERKAS.map((kelompok) => {
				const berkas = data.berkas.filter((item) => item.kelompok === kelompok.nomor);
				return <div key={kelompok.nomor} className="p-4"><h4 className="font-semibold text-navy">Kelompok {kelompok.nomor}: {kelompok.label}</h4>{berkas.length ? <ul className="mt-3 flex flex-col gap-2">{berkas.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setPratinjauId(item.id)} className="text-left underline-offset-4 hover:underline">{item.namaAsli}{item.jenisRekomendasi ? ` · ${LABEL_REKOMENDASI[item.jenisRekomendasi]}` : ""}</button><span className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPratinjauId(item.id)}>Pratinjau</Button><a href={urlUnduhAdmin(data.id, item.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh</a></span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Belum ada berkas.</p>}</div>;
			})}</div></section>
			<PratinjauBerkasSheet berkas={berkasPratinjau} aktifId={pratinjauId} onAktifChange={setPratinjauId} />
			<Link to="/admin" className={buttonVariants({ variant: "outline" })}>Kembali ke tabel</Link>
		</div>
	);
}
