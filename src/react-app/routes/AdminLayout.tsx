import { Download, Home, LogOut, ScrollText, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Footer } from "~/react-app/components/Footer";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import muktamarLockupWarna from "~/react-app/assets/brand/muktamar-xiv-lockup-warna.webp";

const NAV_ADMIN = [
	{ ke: "/admin", label: "Beranda", ikon: Home, end: true },
	{ ke: "/admin/unggah-berkas", label: "Unggah Berkas", ikon: UploadCloud, end: false },
	{ ke: "/admin/ekspor", label: "Ekspor Data", ikon: Download, end: false },
	{ ke: "/admin/audit", label: "Audit", ikon: ScrollText, end: false },
];

export function AdminLayout() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [siap, setSiap] = useState(false);

	useEffect(() => {
		let dibatalkan = false;
		async function tanpaSesi() {
			// Belum ada sesi Admin: bila Admin bersama belum pernah dibuat, langsung
			// ke onboarding alih-alih menyuruh pengguna login ke akun yang tidak ada.
			const onboardTersedia = await fetch("/api/konfigurasi-publik")
				.then((response) => response.json())
				.then((body: { onboardTersedia?: boolean }) => Boolean(body.onboardTersedia))
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
		<SidebarProvider className="h-svh min-h-0 overflow-hidden">
			<Sidebar>
				<SidebarHeader className="px-3 pt-3">
					<NavLink to="/admin" className="flex items-center gap-2.5" aria-label="Beranda Admin">
						<img src={muktamarLockupWarna} alt="Muktamar KAMMI XIV" className="h-10 w-auto" />
						<span className="text-xs leading-tight font-semibold text-navy">
							Komisi Penjaringan Umum
							<br />
							Muktamar KAMMI XIV
						</span>
					</NavLink>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{NAV_ADMIN.map((item) => (
									<SidebarMenuItem key={item.ke}>
										<SidebarMenuButton
											render={<NavLink to={item.ke} end={item.end} />}
											isActive={item.end ? pathname === item.ke : pathname.startsWith(item.ke)}
										>
											<item.ikon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<Dialog>
								<SidebarMenuButton render={<DialogTrigger />}>
									<LogOut />
									<span>Keluar</span>
								</SidebarMenuButton>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Keluar dari Admin bersama?</DialogTitle>
										<DialogDescription>Sesi ini akan diakhiri di perangkat ini. Anggota KPU lain tetap dapat masuk kembali dengan kredensial yang sama.</DialogDescription>
									</DialogHeader>
									<DialogFooter>
										<DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
										<Button variant="destructive" onClick={() => void keluar()}>Keluar</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="h-svh min-h-0 overflow-hidden">
				<header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
					<SidebarTrigger />
					<p className="text-sm font-semibold text-muted-foreground">Admin bersama</p>
				</header>
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
					<div className="flex-1 px-4 py-8 sm:px-8">
						<Outlet />
					</div>
					<Footer />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
