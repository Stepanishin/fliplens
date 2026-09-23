/** Downscale a photo on the device before upload: ~1MP is enough for identification and ~3x cheaper than full resolution. */
export async function resizeToJpegDataUrl(file: File, maxEdge = 1280, quality = 0.85): Promise<string> {
  const source = await decode(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(source.image, 0, 0, w, h);
  if ('close' in source.image) source.image.close();
  return canvas.toDataURL('image/jpeg', quality);
}

type Decoded = { image: ImageBitmap | HTMLImageElement; width: number; height: number };

async function decode(file: File): Promise<Decoded> {
  if ('createImageBitmap' in window) {
    try {
      // Respects EXIF orientation, so portrait phone photos are not sideways.
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bmp, width: bmp.width, height: bmp.height };
    } catch {
      // fall through (e.g. HEIC on browsers that cannot decode it)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    throw new Error('Could not read this image. Try a JPEG or PNG photo.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
