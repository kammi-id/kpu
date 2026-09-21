import { Download, Home, ScrollText, Settings, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell, type DashboardNavItem } from "~/react-app/components/DashboardShell";
import { OutletBerjeda } from "~/react-app/components/OutletBerjeda";
import { ambilKonfigurasiPublik } from "~/react-app/lib/konfigurasiPublik";

const NAV_ADMIN: readonly DashboardNavItem[] = [
	{ ke: "/admin", label: "Beranda", ikon: Home, end: true },
	{ ke: "/admin/unggah-berkas", label: "Unggah Berkas", ikon: UploadCloud, end: false },
	{ ke: "/admin/ekspor", label: "Ekspor Data", ikon: Download, end: false },
	{ ke: "/admin/audit", label: "Audit", ikon: ScrollText, end: false },
	{ ke: "/admin/pengaturan", label: "Pengaturan", ikon: Settings, end: false },
];

export function AdminLayout() {
	const navigate = useNavigate();
	const [siap, setSiap] = useState(false);

	useEffect(() => {
		let dibatalkan = false;
		async function tanpaSesi() {
			// Belum ada sesi Admin: bila Admin bersama belum pernah dibuat, langsung
			// ke onboarding alih-alih menyuruh pengguna login ke akun yang tidak ada.
			const onboardTersedia = await ambilKonfigurasiPublik()
				.then((body) => Boolean(body.onboardTersedia))
				.catch(() => false);
			if (!dibatalkan) navigate(onboardTersedia ? "/onboard" : "/masuk", { replace: true });
		}
		void fetch("/api/auth/get-session")
			.then(async (response) => ({ response, body: await response.json() }))
			.then(({ response, body }) => {
				if (!response.ok || !body?.session || body.user?.role !== "admin") return tanpaSesi();
				if (!dibatalkan) setSiap(true);
			})
			.catch(() => tanpaSesi());
		return () => {
			dibatalkan = true;
		};
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
			navItems={NAV_ADMIN}
			beranda="/admin"
			headerLabel={<p className="text-sm font-semibold text-muted-foreground">Admin bersama</p>}
			logoutJudul="Keluar dari Admin bersama?"
			logoutDeskripsi="Sesi ini akan diakhiri di perangkat ini. Komisioner KPU lain tetap dapat masuk kembali dengan kredensial yang sama."
			onLogout={() => void keluar()}
		>
			<OutletBerjeda />
		</DashboardShell>
	);
}
