import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const privateRoot = join(root, ".private");
const contentPath = join(privateRoot, "content.json");
const templatePath = join(root, "src", "template.html");
const buildDir = join(privateRoot, "build");
const outputPath = join(buildDir, "index.html");

function assertPrivatePath(assetPath) {
  if (!assetPath || typeof assetPath !== "string" || isAbsolute(assetPath)) {
    throw new Error(`Asset paths must be relative to .private/: ${assetPath}`);
  }

  const absolute = resolve(privateRoot, assetPath);
  const insidePrivate = relative(privateRoot, absolute);
  if (insidePrivate.startsWith(`..${sep}`) || insidePrivate === "..") {
    throw new Error(`Asset path leaves .private/: ${assetPath}`);
  }
  return absolute;
}

async function sanitizeAndEmbedImage(assetPath, index) {
  const input = assertPrivatePath(assetPath);
  const temp = await mkdtemp(join(tmpdir(), "birthday-photo-"));
  const output = join(temp, `photo-${index}.jpg`);

  try {
    await execFileAsync("/usr/bin/sips", [
      "--optimizeColorForSharing",
      "-Z",
      "1800",
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "82",
      input,
      "--out",
      output
    ]);
    const data = await readFile(output);
    return `data:image/jpeg;base64,${data.toString("base64")}`;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

const mediaTypes = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav"
};

async function embedAudio(assetPath) {
  const input = assertPrivatePath(assetPath);
  const type = mediaTypes[extname(input).toLowerCase()];
  if (!type) {
    throw new Error("Song must be MP3, M4A, AAC, OGG, or WAV.");
  }
  const data = await readFile(input);
  return `data:${type};base64,${data.toString("base64")}`;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
}

async function main() {
  let content;
  try {
    content = JSON.parse(await readFile(contentPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Missing .private/content.json. Copy content.example.json there first.");
    }
    throw error;
  }

  requireArray(content.letter, "letter");
  requireArray(content.memories, "memories");
  requireArray(content.reasons, "reasons");
  requireArray(content.future, "future");

  const hydrated = structuredClone(content);

  for (const [index, memory] of hydrated.memories.entries()) {
    if (memory.image) {
      memory.imageData = await sanitizeAndEmbedImage(memory.image, index);
    }
    delete memory.image;
  }

  if (hydrated.song) {
    hydrated.songData = await embedAudio(hydrated.song);
  }
  delete hydrated.song;

  const template = await readFile(templatePath, "utf8");
  const serialized = JSON.stringify(hydrated)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

  if (!template.includes("__SITE_CONTENT__")) {
    throw new Error("Template is missing the __SITE_CONTENT__ placeholder.");
  }

  const page = template.replace("__SITE_CONTENT__", serialized);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, page, "utf8");
  console.log(`Built private preview: ${relative(root, outputPath)}`);
  console.log("All configured photos are re-encoded and embedded.");
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
