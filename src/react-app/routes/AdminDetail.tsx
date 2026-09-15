import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buttonVariants } from "~/components/ui/button";
import { KELOMPOK_BERKAS } from "~/lib/kelompok";
import { ResetPasswordDialog } from "~/react-app/components/ResetPasswordDialog";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { ambilDetailBacalonAdmin, urlEksporZip, urlUnduhAdmin, type DetailBacalonAdmin } from "~/react-app/lib/adminBacalon";

const LABEL_REKOMENDASI = { A3_PW: "A.3 dari PW", A4_PD: "A.4 dari PD" } as const;

function nilai(nilai: string | number | boolean | null) {
	if (nilai === null) return "—";
	if (typeof nilai === "boolean") return nilai ? "Ya" : "Tidak";
	return nilai;
}

export function AdminDetail() {
	const { id } = useParams();
	const [data, setData] = useState<DetailBacalonAdmin | null | undefined>(undefined);
	const [pesan, setPesan] = useState("Memuat detail…");

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

	const dataPribadi = [
		["Nama lengkap", data.name], ["Email", data.email], ["WhatsApp", data.whatsapp], ["Nama panggilan", data.namaPanggilan],
		["Tempat lahir", data.tempatLahir], ["Tanggal lahir", data.tanggalLahir], ["Asal PW", data.asalPw], ["Asal PD", data.asalPd],
		["Tahun lulus AB 3", data.tahunLulusDm3], ["Tempat lulus AB 3", data.tempatLulusDm3], ["Instruktur", data.instruktur],
		["Capaian hafalan", data.capaianHafalan], ["Bahasa asing", data.bahasaAsing],
	] as const;

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div><h2 className="font-display text-3xl text-navy">{data.name}</h2><p className="mt-2 text-muted-foreground">Status Kelengkapan Berkas: {data.jumlahHadir}/10</p></div>
				<div className="flex items-center gap-3">
					<StatusBadge terbuka={data.lengkap}>{data.lengkap ? "Lengkap" : "Belum lengkap"}</StatusBadge>
					<ResetPasswordDialog userId={data.id} nama={data.name} />
				</div>
			</div>
			<section aria-labelledby="ekspor-akun">
				<h3 id="ekspor-akun" className="font-display text-xl text-navy">Ekspor akun</h3>
				<div className="mt-3 flex flex-wrap gap-3">
					<a href={urlEksporZip(data.id, "terkini")} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh ZIP Terkini</a>
					<a href={urlEksporZip(data.id, "pemeriksaan")} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh ZIP Pemeriksaan</a>
				</div>
			</section>
			<section aria-labelledby="data-pribadi"><h3 id="data-pribadi" className="font-display text-xl text-navy">Data pribadi</h3><dl className="mt-3 grid gap-x-8 gap-y-3 rounded-xl border border-border bg-white p-5 sm:grid-cols-2">{dataPribadi.map(([label, isi]) => <div key={label}><dt className="text-sm font-semibold text-muted-foreground">{label}</dt><dd className="mt-1">{nilai(isi)}</dd></div>)}</dl></section>
			<section aria-labelledby="kelompok-berkas"><h3 id="kelompok-berkas" className="font-display text-xl text-navy">Sepuluh kelompok berkas</h3><div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white">{KELOMPOK_BERKAS.map((kelompok) => {
				const berkas = data.berkas.filter((item) => item.kelompok === kelompok.nomor);
				return <div key={kelompok.nomor} className="p-4"><h4 className="font-semibold text-navy">Kelompok {kelompok.nomor}: {kelompok.label}</h4>{berkas.length ? <ul className="mt-3 flex flex-col gap-2">{berkas.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3"><span>{item.namaAsli}{item.jenisRekomendasi ? ` · ${LABEL_REKOMENDASI[item.jenisRekomendasi]}` : ""}</span><a href={urlUnduhAdmin(data.id, item.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>Unduh</a></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Belum ada berkas.</p>}</div>;
			})}</div></section>
			<Link to="/admin" className={buttonVariants({ variant: "outline" })}>Kembali ke tabel</Link>
		</div>
	);
}
