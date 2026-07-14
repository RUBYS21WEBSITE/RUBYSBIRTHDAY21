import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "docs", "index.html");
const contentPath = resolve(root, ".private", "content.json");
const coverPath = resolve(root, ".private", "password-cover.jpg");

const robots = [
  '<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">',
  '<meta name="referrer" content="no-referrer">'
].join("\n    ");

const content = JSON.parse(await readFile(contentPath, "utf8"));
const coverImage = await readFile(coverPath);
let encryptedPage = await readFile(outputPath, "utf8");

const lockScreenStyles = `
    <style id="birthday-lock-screen">
      .staticrypt-body {
        min-height: 100%;
        background-image:
          linear-gradient(rgba(18, 12, 10, 0.2), rgba(18, 12, 10, 0.48)),
          url("data:image/jpeg;base64,${coverImage.toString("base64")}");
        background-position: center 32%;
        background-repeat: no-repeat;
        background-size: cover;
      }

      .staticrypt-content {
        min-height: 100%;
        height: auto;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        box-sizing: border-box;
        padding: clamp(1rem, 5vw, 4.5rem);
        background: transparent;
      }

      .staticrypt-page {
        width: min(400px, 100%);
        padding: 0;
        margin: 0;
      }

      .staticrypt-form {
        max-width: none;
        margin: 0;
        padding: clamp(1.5rem, 4vw, 2.75rem);
        border: 1px solid rgba(255, 255, 255, 0.58);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .staticrypt-title {
        margin: 0 0 0.7rem;
        font-size: clamp(1.55rem, 4vw, 2.05rem);
        font-weight: 700;
        line-height: 1.14;
      }

      .staticrypt-instructions p:last-child {
        margin-top: 0;
      }

      @media (max-width: 700px) {
        .staticrypt-body {
          background-position: center 34%;
        }

        .staticrypt-content {
          min-height: 100svh;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
        }

        .staticrypt-form {
          padding: 1.4rem;
          border-radius: 16px;
        }
      }
    </style>`;

if (!encryptedPage.includes('name="robots"')) {
  encryptedPage = encryptedPage.replace(/<head(.*?)>/i, `<head$1>\n    ${robots}`);
}

if (!encryptedPage.includes('id="birthday-lock-screen"')) {
  encryptedPage = encryptedPage.replace(/<\/head>/i, `${lockScreenStyles}\n  </head>`);
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

encryptedPage = encryptedPage.replace(/[ \t]+$/gm, "");
await writeFile(outputPath, encryptedPage, "utf8");
console.log("Privacy check passed: no configured names or messages appear in plaintext.");
console.log("Encrypted GitHub Pages file: docs/index.html");
