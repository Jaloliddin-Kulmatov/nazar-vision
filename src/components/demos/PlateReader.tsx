"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { loadFlorence, type Florence } from "@/lib/demo/florence";
import { drawBox } from "@/lib/demo/image";
import { parseUzPlate, type Plate } from "@/lib/demo/plates";
import { samples, videos } from "@/lib/content";

type Read = { box: number[]; raw: string; plate: Plate | null };

/** Cut out a plate with a little margin and enlarge it, so the text model sees big, sharp characters. */
function cropPlate(input: HTMLCanvasElement, box: number[], pad = { x: 0.08, y: 0.15 }): HTMLCanvasElement {
  const [x1, y1, x2, y2] = box;
  const padX = (x2 - x1) * pad.x;
  const padY = (y2 - y1) * pad.y;
  const sx = Math.max(0, x1 - padX);
  const sy = Math.max(0, y1 - padY);
  const sw = Math.min(input.width, x2 + padX) - sx;
  const sh = Math.min(input.height, y2 + padY) - sy;
  const scale = Math.max(1, 512 / sw);
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(input, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** Find plates with Florence-2's phrase grounding, then read each one with its OCR task. */
async function readPlates(florence: Florence, input: HTMLCanvasElement): Promise<Read[]> {
  const found = await florence(input, "find", "license plate");
  let boxes = (found.boxes ?? [])
    .map((b) => b.box)
    .filter(([x1, y1, x2, y2]) => x2 - x1 > 12 && y2 - y1 > 6)
    .slice(0, 4);
  // A close-up of a plate: the whole picture is the plate.
  if (boxes.length === 0) boxes = [[0, 0, input.width, input.height]];
  const reads: Read[] = [];
  for (const box of boxes) {
    const { text = "" } = await florence(cropPlate(input, box), "text");
    let best: Read = { box, raw: text, plate: parseUzPlate(text) };
    // Not a clean read: try once more on a tighter crop and keep whichever needed fewer corrections.
    if (!best.plate || best.plate.fixes > 0) {
      const { text: again = "" } = await florence(cropPlate(input, box, { x: 0.02, y: 0.04 }), "text");
      const second = parseUzPlate(again);
      if (second && (!best.plate || second.fixes < best.plate.fixes)) best = { box, raw: again, plate: second };
    }
    reads.push(best);
  }
  return reads;
}

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function PlateReaderDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadFlorence);
  const [reads, setReads] = useState<Read[] | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [listDraft, setListDraft] = useState("01 Q 184 OA");
  const watch = new Set(listDraft.split(/[,\n]/).map(squash).filter(Boolean));
  const cache = useRef(new Map<number, Read[]>());
  const log = useEventLog();

  const onList = (p: Plate | null) => Boolean(p && watch.has(squash(p.text)));

  return (
    <DemoStage
      webcam={false}
      size="270 MB"
      model={model}
      maxSide={1280}
      samples={[
        { key: "carGreen", url: samples.carGreen },
        { key: "carRed", url: samples.carRed },
        { key: "plateClose", url: samples.plateClose },
        { key: "trafficFrame", url: videos.traffic, kind: "frame", at: 3 },
      ]}
      onSourceChange={() => {
        cache.current.clear();
        setReads(null);
      }}
      onImage={async (input, ctx, imageId) => {
        let r = cache.current.get(imageId);
        if (!r) {
          const t0 = performance.now();
          r = await readPlates(model.get()!, input);
          setMs(performance.now() - t0);
          cache.current.set(imageId, r);
          for (const x of r) {
            if (x.plate) log.add(t("plateRead"), `${x.plate.text} · ${t(`plateRegions.${x.plate.region}`)}`, onList(x.plate) ? "alert" : "info");
            else if (x.raw) log.add(t("plateUnsure"), x.raw, "warn");
          }
        }
        for (const x of r) {
          const [x1, y1, x2, y2] = x.box;
          const color = !x.plate ? "#ff9f43" : onList(x.plate) ? "#ff5d6c" : "#3ee0a0";
          drawBox(ctx, x1, y1, x2 - x1, y2 - y1, x.plate?.text ?? (x.raw || "?"), color);
        }
        setReads(r);
      }}
      rerunKey={listDraft}
    >
      <Panel title={t("results")}>
        {!reads ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : reads.every((r) => !r.raw) ? (
          <p className="text-sm text-muted">{t("plateNone")}</p>
        ) : (
          <ul className="space-y-3">
            {reads.map((r, i) => (
              <li key={i} className={`rounded-xl border p-3 ${onList(r.plate) ? "border-danger/60 bg-danger/10" : "border-line bg-bg-2"}`}>
                {r.plate ? (
                  <>
                    <p className="flex items-center justify-between gap-2">
                      <span className="tabular rounded-md border-2 border-text/80 bg-white px-2 py-0.5 font-mono text-lg font-bold text-black">{r.plate.text}</span>
                      {onList(r.plate) && <span className="text-xs font-semibold text-danger">{t("plateOnList")}</span>}
                    </p>
                    <p className="mt-2 text-sm">
                      {t(`plateRegions.${r.plate.region}`)} · <span className="text-muted">{t(`plateKinds.${r.plate.kind}`)}</span>
                    </p>
                    {r.plate.fixes > 0 && <p className="mt-1 text-xs text-dim">{t("plateFixes", { n: r.plate.fixes, raw: r.raw })}</p>}
                  </>
                ) : (
                  <p className="text-sm">
                    <span className="text-amber">{t("plateUnsure")}</span> <span className="tabular text-muted">{r.raw || "—"}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {ms !== null && reads && <p className="tabular mt-3 text-xs text-dim">{t("askTime", { s: (ms / 1000).toFixed(1) })}</p>}
      </Panel>
      <Panel title={t("plateList")}>
        <label className="sr-only" htmlFor="plate-list">
          {t("plateList")}
        </label>
        <textarea id="plate-list" value={listDraft} onChange={(e) => setListDraft(e.target.value)} rows={2} className="field resize-none tabular text-sm" />
        <p className="mt-2 text-xs text-dim">{t("plateListHint")}</p>
      </Panel>
      <EventLog events={log.events} onClear={log.clear} name="plate-reader" />
      <p className="text-xs text-dim">{t("plateCredit")}</p>
    </DemoStage>
  );
}
