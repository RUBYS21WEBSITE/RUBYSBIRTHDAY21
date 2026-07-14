import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "docs", "index.html");
const contentPath = resolve(root, ".private", "content.json");

const robots = [
  '<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">',
  '<meta name="referrer" content="no-referrer">'
].join("\n    ");

const content = JSON.parse(await readFile(contentPath, "utf8"));
let encryptedPage = await readFile(outputPath, "utf8");

if (!encryptedPage.includes('name="robots"')) {
  encryptedPage = encryptedPage.replace(/<head(.*?)>/i, `<head$1>\n    ${robots}`);
}

const sensitiveSamples = [
  content.recipient,
  content.from,
  content.heroLine,
  ...(content.letter ?? []),
  ...(content.memories ?? []).flatMap((memory) => [memory.title, memory.caption]),
  ...(content.reasons ?? []),
  content.finalMessage
].filter((value) => typeof value === "string" && value.trim().length >= 8);

const exposed = sensitiveSamples.find((sample) => encryptedPage.includes(sample));
if (exposed) {
  throw new Error(`Privacy check failed: encrypted output still contains plaintext beginning with: ${exposed.slice(0, 24)}`);
}

await writeFile(outputPath, encryptedPage, "utf8");
console.log("Privacy check passed: no configured names or messages appear in plaintext.");
console.log("Encrypted GitHub Pages file: docs/index.html");

