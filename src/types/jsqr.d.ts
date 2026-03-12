/**
 * Augment jsQR return type for our patched build that exposes
 * errorCorrectionLevel and dataMask from the QR format info.
 */
declare module 'jsqr' {
  interface QRCode {
    /** 'L' | 'M' | 'Q' | 'H' (from patched jsQR) */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    /** Mask pattern 0–7 (from patched jsQR) */
    dataMask?: number;
  }
}
export {};
