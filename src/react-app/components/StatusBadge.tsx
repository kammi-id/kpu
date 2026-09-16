import { CheckCircle2, Lock } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Status selalu ikon + teks, tidak pernah warna saja (DESIGN.md "Status bernama").
 * `terbuka` memakai pil hijau dengan centang; sebaliknya pil accent marun dengan gembok.
 */
export function StatusBadge({ terbuka, children }: { terbuka: boolean; children: ReactNode }) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.8125rem] font-bold tracking-[0.08em] uppercase ${
				terbuka ? "bg-hijau text-white" : "bg-accent text-marun"
			}`}
		>
			{terbuka ? <CheckCircle2 className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
			{children}
		</span>
	);
}
