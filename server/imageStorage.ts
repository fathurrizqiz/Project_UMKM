import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const ASSETS_IMG_DIR = path.resolve(process.cwd(), 'assets', 'img');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export interface ParsedImageDataUrl {
  mimeType: string;
  extension: string;
  buffer: Buffer;
}

export function parseBase64ImageDataUrl(dataUrl: string): ParsedImageDataUrl | null {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const extension = MIME_TO_EXT[mimeType];
  if (!extension) return null;

  const cleanBase64 = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (!buffer.length) return null;

  return {
    mimeType,
    extension,
    buffer,
  };
}

export function slugifyImageName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'menu';
}

export function saveBase64ImageToAssetsImg(
  dataUrl: string,
  baseName: string,
): string | null {
  const parsed = parseBase64ImageDataUrl(dataUrl);
  if (!parsed) return null;

  if (!fs.existsSync(ASSETS_IMG_DIR)) {
    fs.mkdirSync(ASSETS_IMG_DIR, { recursive: true });
  }

  const slug = slugifyImageName(baseName);
  const hash = crypto.randomBytes(4).toString('hex');
  const fileName = `${slug}-${hash}.${parsed.extension}`;
  const fullPath = path.join(ASSETS_IMG_DIR, fileName);

  fs.writeFileSync(fullPath, parsed.buffer);
  return `/assets/img/${fileName}`;
}
