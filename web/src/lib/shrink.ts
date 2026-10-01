"use client";

/**
 * Achica fotos del CV antes de subirlas: una foto de celular (4–6 MB) baja a ~0,5 MB.
 * Sube más rápido con datos móviles y el OCR del servidor tarda menos. 2400 px de lado
 * largo en una hoja A4 equivale a ~200 dpi, de sobra para leer texto.
 */
export async function shrinkImage(f: File, max = 2400): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.size < 1_500_000) return f;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f; // navegador viejo: se sube tal cual
  }
}
