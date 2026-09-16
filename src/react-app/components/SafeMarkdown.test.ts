import { describe, expect, it } from "vitest";
import { urlAman } from "./SafeMarkdown";

describe("urlAman", () => {
	it("mengizinkan http, https, dan mailto", () => {
		expect(urlAman("https://kammi.id")).toBe("https://kammi.id");
		expect(urlAman("http://kammi.id")).toBe("http://kammi.id");
		expect(urlAman("mailto:kpu@kammi.id")).toBe("mailto:kpu@kammi.id");
	});

	it("mengizinkan tautan relatif dan anchor tanpa skema", () => {
		expect(urlAman("/peraturan")).toBe("/peraturan");
		expect(urlAman("tentang")).toBe("tentang");
		expect(urlAman("#bagian")).toBe("#bagian");
	});

	it("membuang skema javascript: dan lainnya yang tidak diizinkan", () => {
		expect(urlAman("javascript:alert(1)")).toBe("");
		expect(urlAman("JavaScript:alert(1)")).toBe("");
		expect(urlAman("data:text/html,<script>alert(1)</script>")).toBe("");
		expect(urlAman("vbscript:msgbox(1)")).toBe("");
	});
});
