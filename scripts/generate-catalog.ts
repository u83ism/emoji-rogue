// Writes docs/catalog.md from the game's own data tables (single source of
// truth). Run via `npm run docs:catalog`.
// catalog.test.ts enforces that the committed file matches the generator's
// output, so a balance change without regeneration fails `npm test`.
import { writeFileSync } from "node:fs";
import { buildCatalogMarkdown } from "../src/game/index.js";

writeFileSync("docs/catalog.md", buildCatalogMarkdown(), "utf8");
console.log("docs/catalog.md regenerated");
