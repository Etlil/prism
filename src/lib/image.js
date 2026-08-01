// Shrinks a photo in the browser before it is uploaded.
//
// A phone camera photo is 3–8 MB. Five a day is roughly 40 MB/day of mobile
// data and Supabase storage for images that are never shown larger than a
// polaroid card. Downscaling to 1600px and re-encoding as JPEG typically takes
// a 5 MB photo to around 300 KB.
//
// Everything here is best-effort: if any step fails — an unsupported format
// like HEIC, a canvas that won't encode — the original file is uploaded
// unchanged. Never lose a photo to a failed optimisation.

// Long edge, in pixels. The card displays at ~300px wide; 1600 leaves room to
// zoom or to show these bigger later without going back to the originals.
const MAX_EDGE = 1600

// 0.8 is the usual sweet spot: visually hard to tell from the original, but a
// fraction of the size.
const QUALITY = 0.8

// Below this, compressing usually makes the file BIGGER (re-encoding an
// already-small JPEG adds overhead), so it isn't worth doing.
const SKIP_BELOW_BYTES = 300 * 1024

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function targetSize(width, height) {
  const longest = Math.max(width, height)
  if (longest <= MAX_EDGE) return { width, height }

  const scale = MAX_EDGE / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function compressImage(file) {
  if (!file.type?.startsWith('image/')) return file
  // GIFs would lose their animation, and SVGs aren't photos.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  try {
    // imageOrientation: 'from-image' applies the EXIF rotation tag. Without it
    // photos taken in portrait come out sideways — the canvas keeps the raw
    // pixels and drops the tag that said how to rotate them.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = targetSize(bitmap.width, bitmap.height)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) return file

    // Re-encoding can still come out larger for some inputs — keep whichever
    // is actually smaller.
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Unsupported format (HEIC on some browsers), out of memory on a huge
    // image, canvas tainted — upload what we were given.
    return file
  }
}

// Compresses in sequence rather than in parallel: each one holds a full
// decoded bitmap in memory, and five 12-megapixel photos at once is enough to
// crash a low-end phone.
export async function compressImages(files) {
  const out = []
  for (const file of files) out.push(await compressImage(file))
  return out
}
