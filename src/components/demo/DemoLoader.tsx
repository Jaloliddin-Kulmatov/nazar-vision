"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { DemoSlug } from "@/lib/content";

const Loading = () => (
  <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-line bg-bg-2">
    <Loader2 className="size-8 animate-spin text-cyan" aria-hidden="true" />
  </div>
);

// Each demo (and its ML library) is only downloaded when its page is opened.
const demos: Record<DemoSlug, React.ComponentType> = {
  "object-detection": dynamic(() => import("@/components/demos/ObjectDetection"), { ssr: false, loading: Loading }),
  "people-counter": dynamic(() => import("@/components/demos/PeopleCounter"), { ssr: false, loading: Loading }),
  "face-anonymizer": dynamic(() => import("@/components/demos/FaceAnonymizer"), { ssr: false, loading: Loading }),
  "pose-estimation": dynamic(() => import("@/components/demos/PoseEstimation"), { ssr: false, loading: Loading }),
  "hand-gestures": dynamic(() => import("@/components/demos/HandGestures"), { ssr: false, loading: Loading }),
  ocr: dynamic(() => import("@/components/demos/Ocr"), { ssr: false, loading: Loading }),
  "barcode-scanner": dynamic(() => import("@/components/demos/BarcodeScanner"), { ssr: false, loading: Loading }),
  "background-removal": dynamic(() => import("@/components/demos/BackgroundRemoval"), { ssr: false, loading: Loading }),
  "defect-check": dynamic(() => import("@/components/demos/DefectCheck"), { ssr: false, loading: Loading }),
  "depth-estimation": dynamic(() => import("@/components/demos/DepthEstimation"), { ssr: false, loading: Loading }),
  "safety-zone": dynamic(() => import("@/components/demos/SafetyZone"), { ssr: false, loading: Loading }),
  "ppe-check": dynamic(() => import("@/components/demos/PpeCheck"), { ssr: false, loading: Loading }),
  "fatigue-monitor": dynamic(() => import("@/components/demos/FatigueMonitor"), { ssr: false, loading: Loading }),
  "segment-anything": dynamic(() => import("@/components/demos/SegmentAnything"), { ssr: false, loading: Loading }),
};

export default function DemoLoader({ slug }: { slug: DemoSlug }) {
  const Demo = demos[slug];
  return <Demo />;
}
