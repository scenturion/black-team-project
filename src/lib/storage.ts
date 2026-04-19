import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.STORAGE_PATH || "./public/uploads";

export async function saveFile(
  file: File,
  subfolder: string
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadPath = path.join(process.cwd(), UPLOAD_DIR, subfolder);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }

  const ext = path.extname(file.name);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(uploadPath, filename);

  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}

export async function deleteFile(filePath: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    await unlink(fullPath);
  } catch {
    // file may not exist, ignore
  }
}
