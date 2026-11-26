import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag, Factory, ShieldCheck, Car, FileText, Warehouse, Wheat, Stethoscope,
  ScanLine, Users, ScanFace, PersonStanding, Hand, ScanText, ScanBarcode, Eraser,
  SearchCheck, Layers, Radar, Cpu, Tag, LifeBuoy, Gauge, Bot, Shirt,
  Siren, HardHat, Eye, MousePointerClick, Flame, Timer, ZoomIn, MessageSquareText,
} from "lucide-react";

/** Public sample images (CORS-enabled) from the Transformers.js docs dataset on Hugging Face. */
const HF = "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main";
export const samples = {
  street: `${HF}/city-streets.jpg`,
  football: `${HF}/football-match.jpg`,
  portrait: `${HF}/portrait-of-woman.jpg`,
  manCar: `${HF}/young-man-standing-and-leaning-on-car.jpg`,
  invoice: `${HF}/invoice.png`,
  receipt: `${HF}/receipt.png`,
  bread: `${HF}/bread.png`,
  house: `${HF}/house.jpg`,
  cats: `${HF}/cats.jpg`,
} as const;

/** Sample clips served from /public/videos (free Pexels licence; sources in public/videos/CREDITS.md). */
export const videos = {
  conveyor: "/videos/conveyor.mp4",
  conveyorB: "/videos/conveyor-b.mp4",
  crowd: "/videos/crowd.mp4",
  warehouse: "/videos/warehouse.mp4",
  traffic: "/videos/traffic.mp4",
  workers: "/videos/workers.mp4",
  squat: "/videos/squat.mp4",
  hands: "/videos/hands.mp4",
  driver: "/videos/driver.mp4",
  tired: "/videos/tired.mp4",
  hardhat: "/videos/hardhat.mp4",
} as const;

export const demoSlugs = [
  "object-detection",
  "safety-zone",
  "ppe-check",
  "people-counter",
  "face-anonymizer",
  "pose-estimation",
  "hand-gestures",
  "ocr",
  "barcode-scanner",
  "background-removal",
  "defect-check",
  "depth-estimation",
  "fatigue-monitor",
  "segment-anything",
  "movement-heatmap",
  "queue-dwell",
  "vehicle-speed",
  "image-enhance",
  "scene-describe",
] as const;
export type DemoSlug = (typeof demoSlugs)[number];

export type DemoMeta = {
  slug: DemoSlug;
  icon: LucideIcon;
  engine: string;
  model: string;
  size: string;
  webcam: boolean;
  /** Repos in the library this demo is built on (owner/name). */
  repos: string[];
  /** What the demo is for, used to filter the Demo Lab. */
  group: DemoGroup;
  /** Cover image for cards: a still from one of its samples. */
  cover?: string;
};

export const demoGroups = ["safety", "counting", "quality", "understanding", "documents", "privacy"] as const;
export type DemoGroup = (typeof demoGroups)[number];

/** Still frame for a sample video in /public/videos (made at build time into /public/posters). */
export const posterFor = (videoUrl: string) => videoUrl.replace("/videos/", "/posters/").replace(/\.mp4$/, ".jpg");

/** Small hosted sample images that are light enough to use as thumbnails. */
const lightSamples = new Set<string>([samples.street, samples.football, samples.manCar, samples.invoice, samples.house]);
export const thumbFor = (url: string) => (url.endsWith(".mp4") ? posterFor(url) : lightSamples.has(url) ? url : undefined);

export const demos: DemoMeta[] = [
  { slug: "object-detection", icon: ScanLine, engine: "MediaPipe · Transformers.js", model: "EfficientDet-Lite0 / RT-DETR R18 (COCO)", size: "7–22 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "lyuwenyu/RT-DETR"], group: "counting", cover: "/posters/traffic.jpg" },
  { slug: "safety-zone", icon: Siren, engine: "MediaPipe", model: "EfficientDet-Lite0 + zone logic", size: "7 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "roboflow/supervision"], group: "safety", cover: "/posters/warehouse.jpg" },
  { slug: "ppe-check", icon: HardHat, engine: "Transformers.js", model: "OWLv2 B/16 (open-vocabulary)", size: "163 MB", webcam: false, repos: ["huggingface/transformers.js", "google-research/scenic"], group: "safety", cover: "/posters/hardhat.jpg" },
  { slug: "people-counter", icon: Users, engine: "MediaPipe", model: "EfficientDet-Lite0 + line-crossing tracker", size: "7 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "roboflow/supervision"], group: "counting", cover: "/posters/crowd.jpg" },
  { slug: "face-anonymizer", icon: ScanFace, engine: "MediaPipe", model: "BlazeFace short-range", size: "0.2 MB", webcam: true, repos: ["google-ai-edge/mediapipe"], group: "privacy", cover: "/posters/workers.jpg" },
  { slug: "pose-estimation", icon: PersonStanding, engine: "MediaPipe", model: "Pose Landmarker Lite", size: "6 MB", webcam: true, repos: ["google-ai-edge/mediapipe"], group: "safety", cover: "/posters/squat.jpg" },
  { slug: "hand-gestures", icon: Hand, engine: "MediaPipe", model: "Gesture Recognizer", size: "8 MB", webcam: true, repos: ["google-ai-edge/mediapipe"], group: "privacy", cover: "/posters/hands.jpg" },
  { slug: "ocr", icon: ScanText, engine: "Tesseract.js", model: "Tesseract LSTM (eng · uzb · rus)", size: "~10 MB", webcam: false, repos: ["naptha/tesseract.js", "tesseract-ocr/tesseract"], group: "documents", cover: samples.invoice },
  { slug: "barcode-scanner", icon: ScanBarcode, engine: "zxing-wasm", model: "ZXing-C++", size: "1 MB", webcam: true, repos: ["zxing-cpp/zxing-cpp"], group: "documents" },
  { slug: "background-removal", icon: Eraser, engine: "Transformers.js", model: "MODNet / BiRefNet-lite", size: "6–109 MB", webcam: false, repos: ["huggingface/transformers.js", "ZhengPeng7/BiRefNet"], group: "quality", cover: samples.manCar },
  { slug: "defect-check", icon: SearchCheck, engine: "Transformers.js", model: "MobileCLIP-S0 (zero-shot)", size: "51 MB", webcam: false, repos: ["huggingface/transformers.js", "mlfoundations/open_clip"], group: "quality", cover: "/posters/conveyor-b.jpg" },
  { slug: "depth-estimation", icon: Layers, engine: "Transformers.js", model: "Depth Anything V2 Small", size: "25 MB", webcam: false, repos: ["huggingface/transformers.js", "DepthAnything/Depth-Anything-V2"], group: "quality", cover: samples.house },
  { slug: "fatigue-monitor", icon: Eye, engine: "MediaPipe", model: "Face Landmarker + blendshapes", size: "4 MB", webcam: true, repos: ["google-ai-edge/mediapipe"], group: "safety", cover: "/posters/driver.jpg" },
  { slug: "segment-anything", icon: MousePointerClick, engine: "Transformers.js", model: "SlimSAM-77 (Segment Anything)", size: "14 MB", webcam: false, repos: ["huggingface/transformers.js", "facebookresearch/segment-anything"], group: "quality", cover: "/posters/conveyor.jpg" },
  { slug: "movement-heatmap", icon: Flame, engine: "MediaPipe", model: "EfficientDet-Lite0 + heatmap", size: "7 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "roboflow/supervision"], group: "counting", cover: "/posters/crowd.jpg" },
  { slug: "queue-dwell", icon: Timer, engine: "MediaPipe", model: "EfficientDet-Lite0 + tracker", size: "7 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "roboflow/supervision"], group: "counting", cover: "/posters/workers.jpg" },
  { slug: "vehicle-speed", icon: Gauge, engine: "MediaPipe", model: "EfficientDet-Lite0 + two-line speed trap", size: "7 MB", webcam: true, repos: ["google-ai-edge/mediapipe", "roboflow/supervision"], group: "counting", cover: "/posters/traffic.jpg" },
  { slug: "image-enhance", icon: ZoomIn, engine: "Transformers.js", model: "Swin2SR ×2 (Apache-2.0)", size: "21 MB", webcam: false, repos: ["huggingface/transformers.js", "mv-lab/swin2sr"], group: "quality", cover: "/posters/hardhat.jpg" },
  { slug: "scene-describe", icon: MessageSquareText, engine: "Transformers.js", model: "Florence-2 base (MIT)", size: "270 MB", webcam: false, repos: ["huggingface/transformers.js"], group: "understanding", cover: "/posters/warehouse.jpg" },
];

export const getDemo = (slug: string) => demos.find((d) => d.slug === slug);

export const industryIds = [
  "manufacturing", "textile", "robotics", "logistics", "retail",
  "security", "traffic", "documents", "agriculture", "healthcare",
] as const;
export type IndustryId = (typeof industryIds)[number];

export const industries: { id: IndustryId; icon: LucideIcon; demos: DemoSlug[] }[] = [
  { id: "manufacturing", icon: Factory, demos: ["defect-check", "safety-zone", "ppe-check", "people-counter", "barcode-scanner"] },
  { id: "textile", icon: Shirt, demos: ["defect-check", "segment-anything", "ocr", "barcode-scanner"] },
  { id: "robotics", icon: Bot, demos: ["segment-anything", "depth-estimation", "object-detection", "pose-estimation", "hand-gestures"] },
  { id: "logistics", icon: Warehouse, demos: ["safety-zone", "movement-heatmap", "barcode-scanner", "object-detection", "fatigue-monitor"] },
  { id: "retail", icon: ShoppingBag, demos: ["queue-dwell", "movement-heatmap", "people-counter", "scene-describe", "face-anonymizer"] },
  { id: "security", icon: ShieldCheck, demos: ["safety-zone", "image-enhance", "face-anonymizer", "scene-describe", "object-detection"] },
  { id: "traffic", icon: Car, demos: ["vehicle-speed", "people-counter", "object-detection", "fatigue-monitor", "image-enhance"] },
  { id: "documents", icon: FileText, demos: ["ocr", "scene-describe", "barcode-scanner"] },
  { id: "agriculture", icon: Wheat, demos: ["defect-check", "object-detection", "background-removal"] },
  { id: "healthcare", icon: Stethoscope, demos: ["queue-dwell", "people-counter", "face-anonymizer", "ocr"] },
];

export const serviceIds = ["discovery", "models", "robotics", "labeling", "integration", "support"] as const;
export const serviceIcons: Record<(typeof serviceIds)[number], LucideIcon> = {
  discovery: Radar,
  models: Cpu,
  robotics: Bot,
  labeling: Tag,
  integration: Gauge,
  support: LifeBuoy,
};

/** Demos that show each service in action. */
export const serviceDemos: Record<(typeof serviceIds)[number], DemoSlug[]> = {
  discovery: ["defect-check", "object-detection"],
  models: ["ppe-check", "object-detection", "ocr"],
  robotics: ["segment-anything", "depth-estimation", "pose-estimation"],
  labeling: ["segment-anything", "background-removal"],
  integration: ["safety-zone", "people-counter", "fatigue-monitor"],
  support: [],
};

/** Concrete use cases. Copy lives in messages under useCases.items.<id>. Effort: 1 quick win, 2 standard, 3 advanced. */
export type UseCase = { id: string; industry: IndustryId; demo?: DemoSlug; effort: 1 | 2 | 3 };
export const useCases: UseCase[] = [
  { id: "assembly", industry: "manufacturing", demo: "object-detection", effort: 2 },
  { id: "surface", industry: "manufacturing", demo: "defect-check", effort: 3 },
  { id: "fillLevel", industry: "manufacturing", demo: "segment-anything", effort: 1 },
  { id: "labelCheck", industry: "manufacturing", demo: "ocr", effort: 1 },
  { id: "weld", industry: "manufacturing", demo: "defect-check", effort: 3 },
  { id: "dimensions", industry: "manufacturing", demo: "segment-anything", effort: 2 },
  { id: "packaging", industry: "manufacturing", demo: "defect-check", effort: 2 },
  { id: "conveyorCount", industry: "manufacturing", demo: "people-counter", effort: 1 },
  { id: "machineZone", industry: "manufacturing", demo: "safety-zone", effort: 1 },
  { id: "ppe", industry: "manufacturing", demo: "ppe-check", effort: 2 },
  { id: "gauges", industry: "manufacturing", demo: "ocr", effort: 2 },
  { id: "fabric", industry: "textile", demo: "defect-check", effort: 3 },
  { id: "seams", industry: "textile", demo: "segment-anything", effort: 3 },
  { id: "shade", industry: "textile", demo: "defect-check", effort: 2 },
  { id: "garmentCount", industry: "textile", demo: "people-counter", effort: 1 },
  { id: "binPicking", industry: "robotics", demo: "segment-anything", effort: 3 },
  { id: "cobotSafety", industry: "robotics", demo: "safety-zone", effort: 2 },
  { id: "partPose", industry: "robotics", demo: "depth-estimation", effort: 3 },
  { id: "dock", industry: "logistics", demo: "object-detection", effort: 2 },
  { id: "forkliftProximity", industry: "logistics", demo: "safety-zone", effort: 2 },
  { id: "parcelSize", industry: "logistics", demo: "depth-estimation", effort: 2 },
  { id: "scanTunnel", industry: "logistics", demo: "barcode-scanner", effort: 1 },
  { id: "damage", industry: "logistics", demo: "defect-check", effort: 2 },
  { id: "footfall", industry: "retail", demo: "people-counter", effort: 1 },
  { id: "queues", industry: "retail", demo: "people-counter", effort: 1 },
  { id: "shelves", industry: "retail", demo: "object-detection", effort: 2 },
  { id: "perimeter", industry: "security", demo: "safety-zone", effort: 1 },
  { id: "privacy", industry: "security", demo: "face-anonymizer", effort: 1 },
  { id: "vehicleCount", industry: "traffic", demo: "people-counter", effort: 1 },
  { id: "plates", industry: "traffic", demo: "ocr", effort: 2 },
  { id: "driverFatigue", industry: "traffic", demo: "fatigue-monitor", effort: 2 },
  { id: "waybills", industry: "documents", demo: "ocr", effort: 1 },
  { id: "grading", industry: "agriculture", demo: "defect-check", effort: 2 },
  { id: "livestock", industry: "agriculture", demo: "object-detection", effort: 2 },
  { id: "bakery", industry: "agriculture", demo: "defect-check", effort: 1 },
  { id: "falls", industry: "healthcare", demo: "pose-estimation", effort: 2 },
];
