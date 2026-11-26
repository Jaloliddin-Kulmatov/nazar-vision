"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReadResult } from "zxing-wasm/full";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";

type Zxing = typeof import("zxing-wasm/full");

async function loadZxing(): Promise<Zxing> {
  const z = await import("zxing-wasm/full");
  await z.prepareZXingModule({ fireImmediately: true });
  return z;
}

const readerOptions = { tryHarder: true, maxNumberOfSymbols: 12 } as const;

function drawCodes(ctx: CanvasRenderingContext2D, codes: ReadResult[]) {
  const s = Math.max(1, ctx.canvas.width / 900);
  ctx.save();
  for (const c of codes) {
    const p = c.position;
    ctx.strokeStyle = "#3ee0a0";
    ctx.fillStyle = "rgba(62,224,160,.15)";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(p.topLeft.x, p.topLeft.y);
    ctx.lineTo(p.topRight.x, p.topRight.y);
    ctx.lineTo(p.bottomRight.x, p.bottomRight.y);
    ctx.lineTo(p.bottomLeft.x, p.bottomLeft.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 ${13 * s}px ui-monospace, monospace`;
    const label = `${c.format}: ${c.text.slice(0, 32)}`;
    const tw = ctx.measureText(label).width + 10 * s;
    ctx.fillStyle = "#3ee0a0";
    ctx.fillRect(p.topLeft.x, p.topLeft.y - 22 * s, tw, 20 * s);
    ctx.fillStyle = "#0b1424";
    ctx.fillText(label, p.topLeft.x + 5 * s, p.topLeft.y - 7 * s);
  }
  ctx.restore();
}

export default function BarcodeScannerDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadZxing);
  const [codes, setCodes] = useState<{ format: string; text: string }[]>([]);
  const [scanned, setScanned] = useState(false);
  const lastCodes = useRef<ReadResult[]>([]);
  const scanning = useRef(false);
  const lastScan = useRef(0);

  /** Generate a QR code and an EAN-13 barcode with the writer, side by side on white. */
  const generateSample = async () => {
    const z = await model.load();
    const qr = await z.writeBarcode("https://example.com/order/2026-117", { format: "QRCode", scale: 8 });
    const ean = await z.writeBarcode("4006381333931", { format: "EAN13", scale: 4 });
    const toImg = (svg: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      });
    const [a, b] = await Promise.all([toImg(qr.svg), toImg(ean.svg)]);
    const c = document.createElement("canvas");
    c.width = 1000;
    c.height = 500;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(a, 60, 60, 380, 380);
    const eh = (440 / b.width) * b.height;
    ctx.drawImage(b, 500, 250 - eh / 2, 440, eh);
    return c.toDataURL("image/png");
  };

  return (
    <DemoStage
      webcam
      size="1 MB"
      model={model}
      samples={[{ key: "codes", url: generateSample }]}
      onVideoFrame={(video, ctx, now) => {
        // Decoding is async; scan a few times per second and draw the latest result every frame.
        if (!scanning.current && now - lastScan.current > 250) {
          scanning.current = true;
          lastScan.current = now;
          const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
          model
            .get()!
            .readBarcodes(data, readerOptions)
            .then((res) => {
              lastCodes.current = res.filter((r) => r.isValid);
              if (lastCodes.current.length) {
                setScanned(true);
                setCodes((prev) => {
                  const map = new Map(prev.map((p) => [p.format + p.text, p]));
                  lastCodes.current.forEach((r) => map.set(r.format + r.text, { format: r.format, text: r.text }));
                  return [...map.values()].slice(-10);
                });
              }
            })
            .finally(() => (scanning.current = false));
        }
        drawCodes(ctx, lastCodes.current);
      }}
      onImage={async (input, ctx) => {
        const data = input.getContext("2d")!.getImageData(0, 0, input.width, input.height);
        const res = (await model.get()!.readBarcodes(data, readerOptions)).filter((r) => r.isValid);
        drawCodes(ctx, res);
        setScanned(true);
        setCodes(res.map((r) => ({ format: r.format, text: r.text })));
      }}
      onSourceChange={() => {
        lastCodes.current = [];
        setCodes([]);
        setScanned(false);
      }}
    >
      <Panel title={t("codesFound")}>
        {codes.length === 0 ? (
          <p className="text-sm text-muted">{scanned ? t("noCodes") : t("noResults")}</p>
        ) : (
          <ul className="space-y-2">
            {codes.map((c) => (
              <li key={c.format + c.text} className="rounded-lg border border-line bg-bg-2 p-3">
                <p className="tabular text-xs text-lime">{c.format}</p>
                <p className="mt-1 break-all font-mono text-sm">
                  {/^https?:\/\//.test(c.text) ? (
                    <a href={c.text} target="_blank" rel="noopener noreferrer nofollow" className="text-cyan underline">
                      {c.text}
                    </a>
                  ) : (
                    c.text
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DemoStage>
  );
}
