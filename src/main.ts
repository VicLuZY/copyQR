import {
  decodeFromImageData,
  generateQrFromPayload,
  generateQrFromChunks,
  drawQrToCanvas,
  drawImageToCanvas,
  canvasToPngBlob,
} from './qr';

interface Elements {
  file: HTMLInputElement;
  run: HTMLButtonElement;
  download: HTMLButtonElement;
  status: HTMLElement;
  payload: HTMLElement;
  inputCanvas: HTMLCanvasElement;
  outputCanvas: HTMLCanvasElement;
}

function getElements(): Elements {
  return {
    file: document.getElementById('file') as HTMLInputElement,
    run: document.getElementById('run') as HTMLButtonElement,
    download: document.getElementById('download') as HTMLButtonElement,
    status: document.getElementById('status') as HTMLElement,
    payload: document.getElementById('payload') as HTMLElement,
    inputCanvas: document.getElementById('inputCanvas') as HTMLCanvasElement,
    outputCanvas: document.getElementById('outputCanvas') as HTMLCanvasElement,
  };
}

let inputImageData: ImageData | null = null;
let reconstructedBlobUrl: string | null = null;
let lastFileObjectUrl: string | null = null;

function setStatus(els: Elements, msg: string): void {
  els.status.textContent = msg;
}

function clearPayload(els: Elements): void {
  els.payload.textContent = '';
}

function showPayload(
  els: Elements,
  text: string,
  ecc?: string,
  dataMask?: number
): void {
  const parts: string[] = [];
  if (text) parts.push(`Payload: ${text}`);
  if (ecc) parts.push(`ECC: ${ecc}`);
  if (dataMask !== undefined) parts.push(`Mask: ${dataMask}`);
  els.payload.textContent = parts.length ? parts.join(' · ') : '';
}

function revokeDownloadUrl(): void {
  if (reconstructedBlobUrl) {
    URL.revokeObjectURL(reconstructedBlobUrl);
    reconstructedBlobUrl = null;
  }
}

async function handleReconstruct(els: Elements): Promise<void> {
  clearPayload(els);
  revokeDownloadUrl();

  if (!inputImageData) {
    setStatus(els, 'Please upload an image first.');
    return;
  }

  els.run.disabled = true;
  setStatus(els, 'Detecting QR code…');

  const found = decodeFromImageData(
    inputImageData.data,
    inputImageData.width,
    inputImageData.height
  );

  if (!found) {
    els.run.disabled = false;
    setStatus(
      els,
      'No QR code found. Try a clearer image or crop closer to the QR.'
    );
    return;
  }

  showPayload(
    els,
    found.data,
    found.errorCorrectionLevel,
    found.dataMask
  );
  setStatus(els, 'Reconstructing from payload (same version, proper QR)…');

  const qr =
    found.chunks && found.chunks.length > 0
      ? generateQrFromChunks(found.chunks, found.version, found.errorCorrectionLevel)
      : generateQrFromPayload(found.data, found.version, found.errorCorrectionLevel);
  if (!qr) {
    els.run.disabled = false;
    setStatus(els, 'Payload too long for this QR version. Cannot reconstruct.');
    return;
  }

  drawQrToCanvas(qr, els.outputCanvas);

  setStatus(els, 'Done.');
  els.run.disabled = false;
  els.download.disabled = false;

  const blob = await canvasToPngBlob(els.outputCanvas);
  if (blob) reconstructedBlobUrl = URL.createObjectURL(blob);
}

function handleDownload(): void {
  if (!reconstructedBlobUrl) return;
  const a = document.createElement('a');
  a.href = reconstructedBlobUrl;
  a.download = 'reconstructed-qr.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function init(): void {
  const els = getElements();

  els.file.addEventListener('change', (e: Event) => {
    clearPayload(els);
    revokeDownloadUrl();
    els.download.disabled = true;

    if (lastFileObjectUrl) {
      URL.revokeObjectURL(lastFileObjectUrl);
      lastFileObjectUrl = null;
    }

    const target = e.target as HTMLInputElement;
    const f = target.files?.[0];
    if (!f) return;

    lastFileObjectUrl = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (lastFileObjectUrl) {
        URL.revokeObjectURL(lastFileObjectUrl);
        lastFileObjectUrl = null;
      }
      inputImageData = drawImageToCanvas(img, els.inputCanvas);
      setStatus(els, 'Image loaded. Click Reconstruct.');
      els.run.disabled = false;
    };
    img.onerror = () => {
      if (lastFileObjectUrl) {
        URL.revokeObjectURL(lastFileObjectUrl);
        lastFileObjectUrl = null;
      }
      setStatus(els, 'Could not load that image.');
    };
    img.src = lastFileObjectUrl;
  });

  els.run.addEventListener('click', () => handleReconstruct(els));
  els.download.addEventListener('click', handleDownload);

  setStatus(els, 'Ready. Upload an image.');
}

init();
