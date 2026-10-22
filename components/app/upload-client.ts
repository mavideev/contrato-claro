"use client";
import { prepareUploads } from "@/app/(app)/analisis/actions";

// Subida directa del navegador a S3 (spec 05, "Subida de archivos"): la app
// firma una URL por archivo y el archivo no pasa por el servidor.

export type Uploaded = { key: string; type: string; size: number };

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Algunos sistemas no informan el tipo de un .docx: se deduce por la extensión. */
export function fileType(file: File): string {
  if (file.type) return file.type;
  if (/\.docx$/i.test(file.name)) return DOCX;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  return "";
}

export async function uploadFiles(files: { blob: Blob; type: string }[], onProgress?: (done: number) => void): Promise<{ error: string } | { uploaded: Uploaded[] }> {
  const prepared = await prepareUploads(files.map((f) => ({ type: f.type, size: f.blob.size })));
  if ("error" in prepared) return prepared;
  let done = 0;
  try {
    await Promise.all(
      files.map(async (f, i) => {
        const res = await fetch(prepared.uploads[i].url, { method: "PUT", body: f.blob, headers: { "Content-Type": f.type } });
        if (!res.ok) throw new Error(`PUT ${res.status}`);
        onProgress?.(++done);
      }),
    );
  } catch (err) {
    console.error("[subida]", err);
    return { error: "No pudimos subir el archivo. Revisá tu conexión y probá de nuevo." };
  }
  return { uploaded: files.map((f, i) => ({ key: prepared.uploads[i].key, type: f.type, size: f.blob.size })) };
}

const MAX_SIDE = 2000;

/**
 * Achica la foto (lado mayor de 2000 px, JPEG) y la endereza: createImageBitmap
 * aplica la orientación EXIF. Si el navegador no la puede abrir (HEIC fuera de
 * Safari), se sube tal cual.
 */
export async function compressPhoto(file: File): Promise<{ blob: Blob; type: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) return { blob, type: "image/jpeg" };
  } catch {
    // Se sube el original.
  }
  return { blob: file, type: fileType(file) };
}
