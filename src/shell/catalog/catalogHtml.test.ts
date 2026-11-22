import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalogHtml } from "./catalogHtml.js";

describe("buildCatalogHtml", () => {
	it("matches the committed demo/catalog.html — regenerate with `npm run docs:catalog` if this fails", () => {
		/* normalize CRLF so a checkout with autocrlf can't fail the comparison */
		const committed = readFileSync("demo/catalog.html", "utf8").replaceAll(
			"\r\n",
			"\n",
		);
		expect(committed).toBe(buildCatalogHtml());
	});

	it("turns every Markdown section into a linked heading and its tables into HTML tables", () => {
		const html = buildCatalogHtml();
		expect(html).toContain('<a href="#敵一覧">敵一覧</a>');
		expect(html).toContain('<h2 id="罠一覧">罠一覧</h2>');
		expect(html).toContain("<th>絵文字</th>");
		expect(html).toContain("<td>アクエーター</td>");
		expect(html).toContain("<code>s</code>");
		expect(html).not.toContain("|---|");
		expect(html).not.toContain("**");
	});
});
