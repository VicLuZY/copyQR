import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';

const MAX_DRAW_WIDTH = 900;
const PIXELS_PER_MODULE = 10;

// UTF-8 encoding for payload (so Unicode matches what jsQR decoded)
qrcode.stringToBytes = (s: string): number[] =>
  Array.from(new TextEncoder().encode(s));

export interface DecodedQR {
  data: string;
  version: number;
  moduleCount: number;
}

export function getModuleCountFromVersion(version: number): number {
  return 17 + 4 * (version || 1);
}

export function decodeFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DecodedQR | null {
  const code = jsQR(data, width, height, {
    inversionAttempts: 'attemptBoth',
  });
  if (!code) return null;
  const version = code.version ?? 1;
  return {
    data: code.data,
    version,
    moduleCount: getModuleCountFromVersion(version),
  };
}

export interface QRDrawable {
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

type TypeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

export function generateQrFromPayload(
  data: string,
  version: number
): QRDrawable | null {
  const eccLevels = ['L', 'M', 'Q', 'H'] as const;
  const typeNumber = Math.max(1, Math.min(40, version || 1)) as TypeNumber;
  for (const ecc of eccLevels) {
    try {
      const qr = qrcode(typeNumber, ecc);
      qr.addData(data, 'Byte');
      qr.make();
      return qr;
    } catch {
      continue;
    }
  }
  return null;
}

export function drawQrToCanvas(
  qr: QRDrawable,
  outputCanvas: HTMLCanvasElement
): void {
  const n = qr.getModuleCount();
  const size = n * PIXELS_PER_MODULE;
  outputCanvas.width = size;
  outputCanvas.height = size;
  const ctx = outputCanvas.getContext('2d')!;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let qrRow = 0; qrRow < n; qrRow++) {
    for (let qrCol = 0; qrCol < n; qrCol++) {
      const dark = qr.isDark(qrRow, qrCol);
      const r = dark ? 0 : 255;
      for (let dy = 0; dy < PIXELS_PER_MODULE; dy++) {
        for (let dx = 0; dx < PIXELS_PER_MODULE; dx++) {
          const y = qrRow * PIXELS_PER_MODULE + dy;
          const x = qrCol * PIXELS_PER_MODULE + dx;
          const i = (y * size + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = r;
          data[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const displayScale = Math.max(1, Math.min(3, Math.floor(280 / size)));
  outputCanvas.style.width = `${size * displayScale}px`;
  outputCanvas.style.height = `${size * displayScale}px`;
}

export function drawImageToCanvas(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): ImageData {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const scale =
    img.width > MAX_DRAW_WIDTH ? MAX_DRAW_WIDTH / img.width : 1;
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function canvasToPngBlob(
  canvas: HTMLCanvasElement
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
