import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalogMarkdown } from "./catalog.js";

describe("buildCatalogMarkdown", () => {
	it("matches the committed docs/catalog.md — regenerate with `npm run docs:catalog` if this fails", () => {
		/* normalize CRLF so a checkout with autocrlf can't fail the comparison */
		const committed = readFileSync("docs/catalog.md", "utf8").replaceAll(
			"\r\n",
			"\n",
		);
		expect(committed).toBe(buildCatalogMarkdown());
	});

	it("mentions every enemy, item and trap name exactly where expected", () => {
		const markdown = buildCatalogMarkdown();
		/* spot checks that survive reformatting: one per section */
		expect(markdown).toContain("アクエーター");
		expect(markdown).toContain("テレポートの巻物");
		expect(markdown).toContain("落とし穴");
	});
});
