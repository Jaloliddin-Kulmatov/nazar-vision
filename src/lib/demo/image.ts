/** Scale (w, h) down so the longest side is at most `max`. Never upscales. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Load an image from a URL (cross-origin safe) or a user file. */
export function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    if (typeof src === "string" && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    img.src = url;
  });
}

/** Draw `source` region (sx, sy, sw, sh) back onto ctx at lower resolution: blur or pixelate. */
export function obscureRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: "blur" | "pixelate",
) {
  if (w < 2 || h < 2) return;
  // Strong enough that a face is unrecognisable, not just soft.
  const factor = mode === "blur" ? 40 : 14;
  const tw = Math.max(2, Math.round(w / factor));
  const th = Math.max(2, Math.round(h / factor));
  const tmp = document.createElement("canvas");
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext("2d")!;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(source, x, y, w, h, 0, 0, tw, th);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = mode === "blur";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
  ctx.restore();
}

/** Turbo-like colormap: 0 → dark blue (far), 1 → red (near). */
export function turbo(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  const r = 34.61 + x * (1172.33 - x * (10793.56 - x * (33300.12 - x * (38394.49 - x * 14825.05))));
  const g = 23.31 + x * (557.33 + x * (1225.33 - x * (3574.96 - x * (1073.77 + x * 707.56))));
  const b = 27.2 + x * (3211.1 - x * (15327.97 - x * (27814 - x * (22569.18 - x * 6838.66))));
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [c(r), c(g), c(b)];
}

/** Draw a labelled detection box in the site's style. */
export function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color = "#ffc629",
) {
  const scale = Math.max(1, ctx.canvas.width / 900);
  ctx.save();
  ctx.lineWidth = 2.5 * scale;
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  if (label) {
    ctx.font = `600 ${13 * scale}px ui-monospace, monospace`;
    const tw = ctx.measureText(label).width + 10 * scale;
    const th = 20 * scale;
    const ly = y - th < 0 ? y : y - th;
    ctx.fillStyle = color;
    ctx.fillRect(x - ctx.lineWidth / 2, ly, tw, th);
    ctx.fillStyle = "#0b1424";
    ctx.fillText(label, x + 5 * scale - ctx.lineWidth / 2, ly + 14.5 * scale);
  }
  ctx.restore();
}

/** Grab one frame of a video (URL or user file) at `time` seconds as a canvas. */
export function loadVideoFrame(src: string | File, time = 1): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const done = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, Math.max(0, (video.duration || time) - 0.1));
    };
    video.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext("2d")!.drawImage(video, 0, 0);
      done();
      resolve(c);
    };
    video.onerror = () => {
      done();
      reject(new Error("video_load_failed"));
    };
    video.src = url;
  });
}
