import { execFile } from "node:child_process";

export async function pdfToText(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse/lib/pdf-parse.js") as (b: Buffer) => Promise<{ text: string }>;
  const r = await pdf(buf);
  return (r.text ?? "").slice(0, 60000);
}

/** OCR via tesseract del sistema (imagenes o PDFs escaneados). */
export async function ocrImage(buf: Buffer, ext = "png"): Promise<string> {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "ocr-"));
  const file = join(dir, `cv.${ext}`);
  try {
    await writeFile(file, buf);
    return await new Promise<string>((resolve, reject) => {
      execFile(
        "tesseract",
        [file, "stdout", "-l", "spa+eng", "--psm", "6", "--oem", "1"],
        { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 120000 },
        (err, stdout, stderr) => {
          if (err) reject(new Error(`tesseract: ${String(stderr || err.message).slice(0, 200)}`));
          else resolve(stdout.slice(0, 60000));
        }
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
