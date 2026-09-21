import { FileText, Home, IdCard, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell, type DashboardNavItem } from "~/react-app/components/DashboardShell";
import { OutletBerjeda } from "~/react-app/components/OutletBerjeda";
import { StatusBadge } from "~/react-app/components/StatusBadge";

const NAV_BACALON: readonly DashboardNavItem[] = [
	{ ke: "/bacalon", label: "Ringkasan", ikon: Home, end: true },
	{ ke: "/bacalon/data", label: "Data pribadi", ikon: IdCard, end: false },
	{ ke: "/bacalon/berkas", label: "Berkas", ikon: FileText, end: false },
	{ ke: "/bacalon/pengaturan", label: "Pengaturan", ikon: Settings, end: false },
];

// Status Kelengkapan Berkas (tiket 13): dibaca dari /api/akun, sama seperti
// /bacalon/berkas — vKelengkapan tetap satu-satunya sumber, tidak dihitung ulang di sini.
type RingkasanKelengkapan = { jumlahHadir: number; lengkap: boolean };
const RINGKASAN_AWAL: RingkasanKelengkapan = { jumlahHadir: 0, lengkap: false };

export function BacalonLayout() {
	const navigate = useNavigate();
	const [siap, setSiap] = useState(false);
	const [ringkasan, setRingkasan] = useState<RingkasanKelengkapan>(RINGKASAN_AWAL);

	useEffect(() => {
		let dibatalkan = false;
		void Promise.all([fetch("/api/auth/get-session"), fetch("/api/akun")])
			.then(async ([sesi, akun]) => ({
				sesi: await sesi.json(),
				akun: akun.ok ? (await akun.json()) as { jumlahHadir: number; lengkap: boolean } : null,
				ok: sesi.ok && akun.ok,
			}))
			.then(({ sesi, akun, ok }) => {
				if (!ok || sesi?.user?.role !== "bacalon") return navigate("/masuk", { replace: true });
				if (dibatalkan) return;
				if (akun) setRingkasan({ jumlahHadir: akun.jumlahHadir, lengkap: akun.lengkap });
				setSiap(true);
			})
			.catch(() => navigate("/masuk", { replace: true }));
		return () => { dibatalkan = true; };
	}, [navigate]);

	async function keluar() {
		await fetch("/api/auth/sign-out", { method: "POST" });
		navigate("/masuk", { replace: true });
	}

	if (!siap) {
		return <p className="mx-auto max-w-[76rem] px-4 py-10 text-muted-foreground sm:px-8">Memeriksa sesi…</p>;
	}

	return (
		<DashboardShell
			navItems={NAV_BACALON}
			beranda="/bacalon"
			headerLabel={
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<p className="text-sm font-semibold text-muted-foreground">
						Status Kelengkapan Berkas: {ringkasan.jumlahHadir}/10
					</p>
					<StatusBadge terbuka={ringkasan.lengkap}>{ringkasan.lengkap ? "Lengkap" : "Belum lengkap"}</StatusBadge>
				</div>
			}
			logoutJudul="Keluar dari akun Bakal Calon?"
			logoutDeskripsi="Sesi ini akan diakhiri di perangkat ini. Anda dapat masuk kembali kapan pun dengan kredensial yang sama."
			onLogout={() => void keluar()}
		>
			<OutletBerjeda />
		</DashboardShell>
	);
}
