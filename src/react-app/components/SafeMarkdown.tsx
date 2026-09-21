import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SKEMA_BERAWALAN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const SKEMA_DIIZINKAN = new Set(["http:", "https:", "mailto:"]);

/**
 * Tautan tanpa skema (relatif, termasuk `#anchor`) selalu diizinkan. Tautan
 * berskema hanya lolos bila http(s) atau mailto; selain itu (mis. `javascript:`)
 * dibuang, bukan dirender sebagai href aktif.
 */
export function urlAman(url: string): string {
	const cocok = url.match(SKEMA_BERAWALAN);
	if (!cocok) return url;
	return SKEMA_DIIZINKAN.has(cocok[0].toLowerCase()) ? url : "";
}

const KELAS_RINGKAS = `max-w-[70ch] text-[0.9375rem] leading-relaxed text-navy
	[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:first:mt-0
	[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl
	[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg
	[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
	[&_li]:my-1 [&_a]:text-merah [&_a]:underline [&_a]:underline-offset-[0.2em]
	[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground
	[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-3 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-3`;

/** Dokumen panjang (peraturan): gaya @tailwindcss/typography dengan warna tema Muktamar XIV. */
const KELAS_PROSE = `prose max-w-[70ch]
	[--tw-prose-body:var(--navy)] [--tw-prose-headings:var(--navy)] [--tw-prose-lead:var(--muted-foreground)]
	[--tw-prose-links:var(--merah)] [--tw-prose-bold:var(--navy)] [--tw-prose-counters:var(--muted-foreground)]
	[--tw-prose-bullets:var(--muted-foreground)] [--tw-prose-hr:var(--border)] [--tw-prose-quotes:var(--navy)]
	[--tw-prose-quote-borders:var(--border)] [--tw-prose-captions:var(--muted-foreground)]
	[--tw-prose-th-borders:var(--border)] [--tw-prose-td-borders:var(--border)]
	prose-headings:font-display prose-headings:font-normal prose-a:underline-offset-[0.2em]`;

/**
 * Renderer Markdown bersama: dipakai `/tentang`, `/peraturan` (tiket 11), dan
 * pemberitahuan persetujuan (tiket 10). Tidak pernah merender HTML mentah dari
 * sumber Markdown; react-markdown menampilkannya sebagai teks literal, bukan
 * `dangerouslySetInnerHTML`.
 *
 * `variant="prose"` memakai plugin typography untuk dokumen panjang; bawaan
 * (`ringkas`) tetap untuk potongan pendek seperti kotak persetujuan.
 */
export function SafeMarkdown({ children, variant = "ringkas" }: { children: string; variant?: "ringkas" | "prose" }) {
	return (
		<div className={variant === "prose" ? KELAS_PROSE : KELAS_RINGKAS}>
			<ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlAman}>{children}</ReactMarkdown>
		</div>
	);
}
