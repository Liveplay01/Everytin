/**
 * Creates a valid ICO 3.00 format file (DIB-based, no external dependencies)
 * Used to generate src-tauri/icons/icon.ico for the Tauri build.
 */
import { writeFileSync } from 'fs'

function createIcoBmp(size, r, g, b) {
  const pixels = size * size
  const pixelBytes = pixels * 4 // BGRA
  const maskStride = Math.ceil(size / 32) * 4 // DWORD-aligned row
  const andMaskBytes = maskStride * size
  const bmpDataSize = 40 + pixelBytes + andMaskBytes

  // ICO file header (6 bytes)
  const header = Buffer.allocUnsafe(6)
  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // type = ICO
  header.writeUInt16LE(1, 4)  // image count = 1

  // ICO directory entry (16 bytes)
  const dir = Buffer.allocUnsafe(16)
  dir.writeUInt8(size === 256 ? 0 : size, 0)  // width (0 = 256)
  dir.writeUInt8(size === 256 ? 0 : size, 1)  // height (0 = 256)
  dir.writeUInt8(0, 2)            // color count
  dir.writeUInt8(0, 3)            // reserved
  dir.writeUInt16LE(1, 4)         // planes
  dir.writeUInt16LE(32, 6)        // bit depth
  dir.writeUInt32LE(bmpDataSize, 8)  // size of bitmap data
  dir.writeUInt32LE(22, 12)          // offset: 6 (header) + 16 (dir)

  // BITMAPINFOHEADER (40 bytes)
  const bih = Buffer.allocUnsafe(40)
  bih.fill(0)
  bih.writeUInt32LE(40, 0)          // biSize
  bih.writeInt32LE(size, 4)         // biWidth
  bih.writeInt32LE(size * 2, 8)     // biHeight × 2 (ICO convention)
  bih.writeUInt16LE(1, 12)          // biPlanes
  bih.writeUInt16LE(32, 14)         // biBitCount
  bih.writeUInt32LE(0, 16)          // biCompression = BI_RGB

  // Pixel data: BGRA, bottom-to-top row order
  const pixData = Buffer.allocUnsafe(pixelBytes)
  for (let i = 0; i < pixels; i++) {
    pixData[i * 4 + 0] = b  // B
    pixData[i * 4 + 1] = g  // G
    pixData[i * 4 + 2] = r  // R
    pixData[i * 4 + 3] = 255  // A
  }

  // AND mask: all zeros = fully opaque
  const andMask = Buffer.alloc(andMaskBytes, 0)

  return Buffer.concat([header, dir, bih, pixData, andMask])
}

// Indigo #4F46E5 = R79 G70 B229
const R = 79, G = 70, B = 229
const ico = createIcoBmp(32, R, G, B)
writeFileSync('src-tauri/icons/icon.ico', ico)
console.log('Created valid ICO (32x32, 32bpp DIB format):', ico.length, 'bytes')
