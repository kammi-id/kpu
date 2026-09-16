import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "~/components/ui/button";
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

export interface DashboardNavItem {
	ke: string;
	label: string;
	ikon: LucideIcon;
	end: boolean;
}

interface DashboardShellProps {
	navItems: readonly DashboardNavItem[];
	beranda: string;
	headerLabel: ReactNode;
	logoutJudul: string;
	logoutDeskripsi: string;
	onLogout: () => void;
	children: ReactNode;
}

/**
 * Dasbor sidebar bersama Admin dan Bacalon (lihat Q6 grilling): chrome (logo,
 * sidebar, dialog keluar) sama persis — hanya nav, label header, dan teks
 * dialog keluar yang berbeda per peran. Footer publik sengaja tidak
 * ditampilkan di dasbor. Gerbang sesi/peran tetap di masing-masing pemanggil
 * (AdminLayout, BacalonLayout), bukan di sini.
 */
export function DashboardShell({ navItems, beranda, headerLabel, logoutJudul, logoutDeskripsi, onLogout, children }: DashboardShellProps) {
	const { pathname } = useLocation();

	return (
		<SidebarProvider className="h-svh min-h-0 overflow-hidden">
			<Sidebar>
				<SidebarHeader className="px-3 pt-3">
					<NavLink to={beranda} className="flex items-center gap-2.5" aria-label="Beranda">
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
								{navItems.map((item) => (
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
										<DialogTitle>{logoutJudul}</DialogTitle>
										<DialogDescription>{logoutDeskripsi}</DialogDescription>
									</DialogHeader>
									<DialogFooter>
										<DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
										<Button variant="destructive" onClick={onLogout}>Keluar</Button>
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
					{headerLabel}
				</header>
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
					<div className="flex-1 px-4 py-8 sm:px-8">{children}</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
