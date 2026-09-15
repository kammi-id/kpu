import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Footer } from "~/react-app/components/Footer";
import { StatusBadge } from "~/react-app/components/StatusBadge";
import { LABEL_TAHAP } from "~/react-app/lib/tahap";
import { useTahap } from "~/react-app/lib/useTahap";

// Status Kelengkapan Berkas (tiket 13): dibaca dari /api/akun, sama seperti
// /akun/berkas — vKelengkapan tetap satu-satunya sumber, tidak dihitung ulang di sini.
type RingkasanKelengkapan = { jumlahHadir: number; lengkap: boolean };
const RINGKASAN_AWAL: RingkasanKelengkapan = { jumlahHadir: 0, lengkap: false };

export function AkunLayout() {
	const navigate = useNavigate();
	const { data: tahap } = useTahap();
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

	return (
		<div className="flex min-h-svh flex-col">
			<main className="flex-1">
				{siap ? (
					<section className="mx-auto max-w-[76rem] px-4 py-8 sm:px-8">
						<header className="mb-6 border-b border-red-200 pb-5">
							<p className="text-sm font-semibold text-muted-foreground">
								{tahap ? LABEL_TAHAP[tahap.tahap] : "Memuat tahap…"}
							</p>
							<div className="mt-3 flex flex-wrap items-center justify-between gap-4">
								<div>
									<h1 className="font-display text-3xl text-navy">Akun Bakal Calon</h1>
									<p className="mt-1 text-sm text-muted-foreground">
										Status Kelengkapan Berkas: {ringkasan.jumlahHadir}/10
									</p>
								</div>
								<StatusBadge terbuka={ringkasan.lengkap}>
									{ringkasan.lengkap ? "Lengkap" : "Belum lengkap"}
								</StatusBadge>
							</div>
							<nav aria-label="Navigasi akun" className="mt-5 flex flex-wrap gap-4 font-semibold text-navy">
								<NavLink to="/akun" end className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>
									Ringkasan
								</NavLink>
								<NavLink to="/akun/berkas" className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>
									Berkas
								</NavLink>
								<NavLink to="/akun/pengaturan" className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>
									Pengaturan
								</NavLink>
								<Button variant="link" className="h-auto p-0 text-navy" onClick={keluar}>
									Keluar
								</Button>
							</nav>
						</header>
						<Outlet />
					</section>
				) : (
					<p className="mx-auto max-w-[76rem] px-4 py-10 text-muted-foreground sm:px-8">Memeriksa sesi…</p>
				)}
			</main>
			<Footer />
		</div>
	);
}
