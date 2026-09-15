export type BerkasPublik = {
	id: string;
	judul: string;
	urutan: number;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
};

export type PeraturanPublik = {
	isiMarkdown: string | null;
	berkasPublik: BerkasPublik[];
};

export async function ambilPeraturan(signal?: AbortSignal): Promise<PeraturanPublik> {
	const response = await fetch("/api/peraturan", { signal });
	if (!response.ok) throw new Error("Peraturan tidak dapat dimuat");
	return (await response.json()) as PeraturanPublik;
}

export async function ambilUnduhan(signal?: AbortSignal): Promise<BerkasPublik[]> {
	const response = await fetch("/api/unduhan", { signal });
	if (!response.ok) throw new Error("Unduhan tidak dapat dimuat");
	return ((await response.json()) as { berkasPublik: BerkasPublik[] }).berkasPublik;
}

export function urlUnduhBerkasPublik(id: string) {
	return `/api/berkas-publik/${encodeURIComponent(id)}`;
}
