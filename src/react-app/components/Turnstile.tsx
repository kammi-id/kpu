import { useEffect, useRef, useState } from "react";
import { ambilKonfigurasiPublik } from "~/react-app/lib/konfigurasiPublik";

type TurnstileApi = { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => void };

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
	const wadah = useRef<HTMLDivElement>(null);
	const [pesan, setPesan] = useState("");

	useEffect(() => {
		let dibatalkan = false;
		const render = (sitekey: string) => {
			if (dibatalkan || !wadah.current || !window.turnstile) return;
			window.turnstile.render(wadah.current, {
				sitekey,
				callback: (token) => onToken(token),
				"expired-callback": () => onToken(null),
			});
		};

		void ambilKonfigurasiPublik()
			.then(({ turnstileSiteKey }) => {
				if (!turnstileSiteKey) return setPesan("Verifikasi Turnstile belum tersedia.");
				const ada = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
				if (ada) {
					if (window.turnstile) render(turnstileSiteKey);
					else ada.addEventListener("load", () => render(turnstileSiteKey), { once: true });
					return;
				}
				const script = document.createElement("script");
				script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
				script.async = true;
				script.onload = () => render(turnstileSiteKey);
				script.onerror = () => setPesan("Verifikasi Turnstile tidak dapat dimuat. Coba lagi.");
				document.head.append(script);
			})
			.catch(() => setPesan("Verifikasi Turnstile tidak dapat dimuat. Coba lagi."));

		return () => { dibatalkan = true; };
	}, [onToken]);

	return <div ref={wadah}>{pesan ? <p className="text-sm text-destructive" role="alert">{pesan}</p> : null}</div>;
}
