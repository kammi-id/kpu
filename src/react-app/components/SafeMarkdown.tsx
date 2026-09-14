import ReactMarkdown from "react-markdown";

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

/**
 * Renderer Markdown bersama: dipakai `/tentang`, `/peraturan` (tiket 11), dan
 * pemberitahuan persetujuan (tiket 10). Tidak pernah merender HTML mentah dari
 * sumber Markdown; react-markdown menampilkannya sebagai teks literal, bukan
 * `dangerouslySetInnerHTML`.
 */
export function SafeMarkdown({ children }: { children: string }) {
	return (
		<div
			className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-navy
				[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:first:mt-0
				[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl
				[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg
				[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
				[&_li]:my-1 [&_a]:text-merah [&_a]:underline [&_a]:underline-offset-[0.2em]
				[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground"
		>
			<ReactMarkdown urlTransform={urlAman}>{children}</ReactMarkdown>
		</div>
	);
}
