// Writes docs/catalog.md and its web page twin demo/catalog.html from the
// game's own data tables (single source of truth). Run via
// `npm run docs:catalog`.
// catalog.test.ts / catalogHtml.test.ts enforce that the committed files
// match the generator's output, so a balance change without regeneration
// fails `npm test`.
import { writeFileSync } from "node:fs";
import { buildCatalogHtml, buildCatalogMarkdown } from "../src/game/index.js";

writeFileSync("docs/catalog.md", buildCatalogMarkdown(), "utf8");
writeFileSync("demo/catalog.html", buildCatalogHtml(), "utf8");
console.log("docs/catalog.md and demo/catalog.html regenerated");
