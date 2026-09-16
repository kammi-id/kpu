export async function ajukanPenutupanAkun(password: string) {
	const response = await fetch("/api/akun/pengaturan/penutupan", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ password }),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(body?.error === "kata_sandi_salah" ? "Kata sandi salah." : "Permintaan penutupan akun gagal.");
	}
}
