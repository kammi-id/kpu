import fs from "node:fs";
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import JSON5 from "json5";
import { defineConfig } from "vitest/config";

// The `ai` binding in wrangler.json (tiket 23) can never run against a local
// simulator — the vitest-plugin unconditionally treats it as a remote
// binding and tries to open a real Cloudflare proxy session for it before
// *any* test file starts, which fails outside an interactive session unless
// CLOUDFLARE_API_TOKEN is set (e.g. in CI). ekstraksiA1 is always
// dependency-injected as a fake in tests (see ekstraksiA1.test.ts) and never
// touches env.AI, so the binding can simply be omitted from the config the
// test pool loads. Written next to wrangler.json (not os.tmpdir()) so its
// relative paths (`main`, `assets.directory`) still resolve; gitignored.
function konfigWranglerTanpaAi(): string {
	const konfigurasi = JSON5.parse(fs.readFileSync(path.join(__dirname, "wrangler.json"), "utf-8"));
	delete konfigurasi.ai;
	const berkasSementara = path.join(__dirname, ".wrangler.vitest.json");
	fs.writeFileSync(berkasSementara, JSON.stringify(konfigurasi));
	return berkasSementara;
}

export default defineConfig({
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
	plugins: [
		cloudflareTest(async () => {
			const migrationsPath = path.join(__dirname, "migrations");
			const migrations = await readD1Migrations(migrationsPath);
			return {
				wrangler: { configPath: konfigWranglerTanpaAi() },
				miniflare: {
					// Pinned so the suite is independent of a developer's local `.dev.vars`
					// (e.g. BETTER_AUTH_URL overridden for `npm run dev`), which Miniflare
					// otherwise loads automatically and which would desync from the
					// `https://kpu.kammi.id` origin every test request sends.
					bindings: {
						TEST_MIGRATIONS: migrations,
						BETTER_AUTH_URL: "https://kpu.kammi.id",
						TURNSTILE_SITE_KEY: "",
					},
				},
			};
		}),
	],
	test: {
		setupFiles: ["./src/worker/test/apply-migrations.ts", "./src/worker/test/mock-jaringan.ts"],
		// Better Auth 1.7 (pinned exact per spec) rejects a dangling internal
		// promise with the same APIError it already turned into a correct HTTP
		// response, on every expected sign-in/sign-up failure path (wrong
		// password, duplicate user, banned user). It surfaces inside workerd via
		// @cloudflare/vitest-plugin's own unhandled-rejection reporting, which
		// bypasses `test.onUnhandledError` (tried and confirmed ineffective here)
		// — a known upstream defect with no functional impact, not application
		// code. Every assertion in this suite still runs against the real
		// Response; this only stops that second, unrelated promise from failing
		// the run. Revisit when Better Auth is upgraded past 1.7.
		dangerouslyIgnoreUnhandledErrors: true,
	},
});
