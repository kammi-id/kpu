import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Footer } from "~/react-app/components/Footer";

export function AdminLayout() {
	const navigate = useNavigate();
	const [siap, setSiap] = useState(false);

	useEffect(() => {
		let dibatalkan = false;
		void fetch("/api/auth/get-session")
			.then(async (response) => ({ response, body: await response.json() }))
			.then(({ response, body }) => {
				if (!response.ok || !body?.session || body.user?.role !== "admin") return navigate("/masuk", { replace: true });
				if (!dibatalkan) setSiap(true);
			})
			.catch(() => navigate("/masuk", { replace: true }));
		return () => {
			dibatalkan = true;
		};
	}, [navigate]);

	return (
		<div className="flex min-h-svh flex-col">
			<main className="flex-1">
				{siap ? (
					<section className="mx-auto max-w-[76rem] px-4 py-10 sm:px-8">
						<header className="flex flex-col gap-3 border-b border-red-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
							<h1 className="font-display text-3xl text-navy">Admin bersama</h1>
							<nav aria-label="Navigasi Admin" className="flex gap-4 font-semibold text-navy">
								<NavLink to="/admin" end className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>Beranda</NavLink>
								<NavLink to="/admin/ekspor" className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>Ekspor</NavLink>
								<NavLink to="/admin/audit" className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>Audit</NavLink>
								<NavLink to="/admin/peraturan" className={({ isActive }) => isActive ? "underline decoration-2 underline-offset-4" : ""}>Peraturan</NavLink>
							</nav>
						</header>
						<div className="pt-6"><Outlet /></div>
					</section>
				) : <p className="mx-auto max-w-[76rem] px-4 py-10 text-muted-foreground sm:px-8">Memeriksa sesi…</p>}
			</main>
			<Footer />
		</div>
	);
}
