import { EditorContent, type EditorEvents, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect } from "react";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

// tiptap-markdown tidak menyertakan augmentasi tipe untuk `editor.storage.markdown`.
declare module "@tiptap/core" {
	interface Storage {
		markdown: MarkdownStorage;
	}
}

// Dideklarasikan di luar komponen agar referensinya stabil di setiap render —
// `useEditor` (deps `[]`) membandingkan opsi lama dan baru lewat `compareOptions`
// tiap render dan memanggil `setOptions` bila ada field yang berubah referensi;
// array/objek baru pada tiap render membuatnya terpicu di setiap ketikan.
const EKSTENSI = [
	StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
	Markdown.configure({ html: false, transformPastedText: true }),
];

const ATRIBUT_EDITOR = {
	attributes: {
		class:
			"min-h-full text-[0.9375rem] leading-relaxed text-navy outline-none " +
			"[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:first:mt-0 " +
			"[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg " +
			"[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 " +
			"[&_li]:my-1 [&_a]:text-merah [&_a]:underline [&_a]:underline-offset-[0.2em] " +
			"[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
	},
};

type Props = {
	value: string;
	onChange: (markdown: string) => void;
	placeholder?: string;
	className?: string;
};

/**
 * Editor WYSIWYG yang membaca dan menulis Markdown mentah (tiptap-markdown),
 * agar kontrak `PUT /api/admin/peraturan` (body Markdown, `text/markdown`)
 * tidak berubah. Fitur dibatasi sesuai yang dirender SafeMarkdown: H2/H3,
 * tebal, miring, daftar, kutipan, tautan — tanpa tabel atau HTML mentah.
 */
export function MarkdownEditor({ value, onChange, placeholder, className }: Props) {
	// `onUpdate` ada di daftar abai `compareOptions` (@tiptap/react), jadi
	// referensi baru tiap render tidak memicu `setOptions` — tak perlu distabilkan
	// seperti `EKSTENSI`/`ATRIBUT_EDITOR` di atas.
	const handleUpdate = useCallback(
		({ editor: instance }: EditorEvents["update"]) => onChange(instance.storage.markdown.getMarkdown()),
		[onChange],
	);

	const editor = useEditor({
		// Tanpa ini, React 19 StrictMode (dev) me-render dua kali dan sempat
		// membuat lalu langsung menghancurkan instance pertama sebelum
		// `onBeforeCreate` tiptap-markdown selesai memasang `storage.markdown`,
		// menyebabkan `getMarkdown()` melempar pada editor kedua.
		immediatelyRender: false,
		extensions: EKSTENSI,
		editorProps: ATRIBUT_EDITOR,
		onUpdate: handleUpdate,
	});

	// Peraturan dimuat secara asinkron: editor sudah terbentuk lebih dulu dengan
	// dokumen kosong, jadi konten disinkronkan begitu fetch (atau perubahan luar
	// lain) selesai. Ditulis kembali hanya bila berbeda dari isi editor saat ini,
	// agar kursor pengguna tidak melompat ketika sinkronisasi ini dipicu oleh
	// perubahannya sendiri lewat `onUpdate`.
	useEffect(() => {
		if (!editor) return;
		const markdownSaatIni = editor.storage.markdown.getMarkdown();
		if (value !== markdownSaatIni) editor.commands.setContent(value, { emitUpdate: false });
	}, [value, editor]);

	const state = useEditorState({
		editor,
		selector: ({ editor: instance }) =>
			instance
				? {
						bold: instance.isActive("bold"),
						italic: instance.isActive("italic"),
						h2: instance.isActive("heading", { level: 2 }),
						h3: instance.isActive("heading", { level: 3 }),
						bulletList: instance.isActive("bulletList"),
						orderedList: instance.isActive("orderedList"),
						blockquote: instance.isActive("blockquote"),
						link: instance.isActive("link"),
						canUndo: instance.can().undo(),
						canRedo: instance.can().redo(),
					}
				: null,
	});

	function taut() {
		if (!editor) return;
		if (state?.link) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const url = window.prompt("Alamat tautan (https://…)");
		if (!url) return;
		editor.chain().focus().setLink({ href: url }).run();
	}

	return (
		<div
			className={`flex flex-col rounded-xl border border-input bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 ${className ?? ""}`}
		>
			<div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
				<TombolAlat aktif={state?.bold ?? false} label="Tebal" onClick={() => editor?.chain().focus().toggleBold().run()}>
					<Bold />
				</TombolAlat>
				<TombolAlat aktif={state?.italic ?? false} label="Miring" onClick={() => editor?.chain().focus().toggleItalic().run()}>
					<Italic />
				</TombolAlat>
				<Pemisah />
				<TombolAlat aktif={state?.h2 ?? false} label="Subjudul" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
					<Heading2 />
				</TombolAlat>
				<TombolAlat aktif={state?.h3 ?? false} label="Anak subjudul" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
					<Heading3 />
				</TombolAlat>
				<Pemisah />
				<TombolAlat aktif={state?.bulletList ?? false} label="Daftar bertitik" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
					<List />
				</TombolAlat>
				<TombolAlat aktif={state?.orderedList ?? false} label="Daftar bernomor" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
					<ListOrdered />
				</TombolAlat>
				<TombolAlat aktif={state?.blockquote ?? false} label="Kutipan" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
					<Quote />
				</TombolAlat>
				<TombolAlat aktif={state?.link ?? false} label="Tautan" onClick={taut}>
					<Link2 />
				</TombolAlat>
				<Pemisah />
				<TombolAlat label="Urungkan" disabled={!(state?.canUndo ?? false)} onClick={() => editor?.chain().focus().undo().run()}>
					<Undo2 />
				</TombolAlat>
				<TombolAlat label="Ulangi" disabled={!(state?.canRedo ?? false)} onClick={() => editor?.chain().focus().redo().run()}>
					<Redo2 />
				</TombolAlat>
			</div>
			<EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-placeholder={placeholder} />
		</div>
	);
}

function Pemisah() {
	return <div className="mx-1 h-6 w-px bg-border" aria-hidden />;
}

function TombolAlat({
	children,
	label,
	aktif = false,
	disabled = false,
	onClick,
}: {
	children: ReactNode;
	label: string;
	aktif?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={aktif}
			disabled={disabled}
			onClick={onClick}
			className={`inline-flex size-8 items-center justify-center rounded-lg transition-colors [&_svg]:size-4 ${
				aktif ? "bg-accent text-marun" : "text-navy hover:bg-muted"
			} disabled:pointer-events-none disabled:opacity-40`}
		>
			{children}
		</button>
	);
}
