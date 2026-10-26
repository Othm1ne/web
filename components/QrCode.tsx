import QRCode from "qrcode";

/** A QR code as one SVG path: dark modules on a white tile (scanners need the light quiet zone). */
export function QrCode({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const { size, data } = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
  const margin = 2;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (data[y * size + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
  }
  const box = size + margin * 2;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} role="img" aria-label={label} shapeRendering="crispEdges" className={`rounded-2xl bg-white ${className}`}>
      <path d={path} fill="#000" />
    </svg>
  );
}
