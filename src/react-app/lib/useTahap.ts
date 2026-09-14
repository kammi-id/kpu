import { useEffect, useState } from "react";
import { ambilTahap, type TahapApi } from "./tahap";

interface UseTahapState {
	data: TahapApi | null;
	error: boolean;
}

/** Sumber tunggal tahap di klien: selalu jam server lewat /api/tahap, tidak pernah jam perangkat. */
export function useTahap(): UseTahapState {
	const [data, setData] = useState<TahapApi | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		ambilTahap(controller.signal)
			.then(setData)
			.catch((err) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setError(true);
			});
		return () => controller.abort();
	}, []);

	return { data, error };
}
