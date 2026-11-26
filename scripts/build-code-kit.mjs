#!/usr/bin/env node
/**
 * Packages every demo into a standalone Next.js project and zips it to
 * .code-kit/nazar-vision-demos.zip. The site serves that zip to signed-in users
 * (see src/app/api/code/route.ts). Runs automatically before `npm run build`.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "nazar-vision-demos";
const SITE = "https://nazar-vision.vercel.app";
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const files = {};

const add = (rel, content) => {
  files[`${NAME}/${rel}`] = typeof content === "string" ? strToU8(content) : content;
};
const copyDir = (rel) => {
  for (const entry of readdirSync(path.join(root, rel))) {
    const r = `${rel}/${entry}`;
    if (statSync(path.join(root, r)).isDirectory()) copyDir(r);
    else add(r, readFileSync(path.join(root, r)));
  }
};
const copy = (rel) => add(rel, readFileSync(path.join(root, rel)));

// The demos themselves, unchanged from the website.
copyDir("src/components/demo");
copyDir("src/components/demos");
copyDir("src/lib/demo");
copy("src/lib/content.ts");
copy("src/app/globals.css");

// Only the English text the demos use.
const en = JSON.parse(readFileSync(path.join(root, "messages/en.json"), "utf8"));
add("messages/en.json", JSON.stringify({ common: en.common, demos: en.demos }, null, 2) + "\n");

const dep = (name) => pkg.dependencies[name] ?? pkg.devDependencies[name];
add(
  "package.json",
  JSON.stringify(
    {
      name: NAME,
      version: "1.0.0",
      private: true,
      license: "MIT",
      scripts: { dev: "next dev", build: "next build", start: "next start", samples: "node scripts/fetch-samples.mjs" },
      dependencies: Object.fromEntries(
        ["next", "react", "react-dom", "next-intl", "@mediapipe/tasks-vision", "@huggingface/transformers", "tesseract.js", "zxing-wasm", "lucide-react"].map((n) => [n, dep(n)]),
      ),
      devDependencies: {
        typescript: dep("typescript"),
        "@types/node": dep("@types/node"),
        "@types/react": dep("@types/react"),
        "@types/react-dom": dep("@types/react-dom"),
        tailwindcss: dep("tailwindcss"),
        "@tailwindcss/postcss": dep("tailwindcss"),
      },
    },
    null,
    2,
  ) + "\n",
);

add(
  "tsconfig.json",
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ) + "\n",
);

add(
  "next.config.ts",
  `import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
`,
);

add("postcss.config.mjs", `export default { plugins: { "@tailwindcss/postcss": {} } };\n`);

add(
  "src/i18n/request.ts",
  `import { getRequestConfig } from "next-intl/server";
import messages from "../../messages/en.json";

// One language here. The website also ships Uzbek and Russian; add more files and pick by locale if you need them.
export default getRequestConfig(async () => ({ locale: "en", messages }));
`,
);

add(
  "src/app/layout.tsx",
  `import type { Metadata } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";

const geologica = Geologica({ subsets: ["latin", "latin-ext", "cyrillic"], axes: ["SHRP"], variable: "--font-geologica", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = { title: "Computer vision demos", description: "In-browser computer vision demos" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={\`\${geologica.variable} \${jetbrains.variable}\`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
`,
);

add(
  "src/app/page.tsx",
  `import Link from "next/link";
import { useTranslations } from "next-intl";
import { demos } from "@/lib/content";

export default function Home() {
  const t = useTranslations("demos");
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">Computer vision demos</h1>
      <p className="mt-3 max-w-2xl text-muted">Every model runs in this browser tab. Pick a demo; the first run downloads its model once.</p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((d) => (
          <li key={d.slug}>
            <Link href={\`/demos/\${d.slug}\`} className="block overflow-hidden rounded-xl border border-line bg-panel/60 hover:border-line-strong">
              {d.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.cover} alt="" className="aspect-video w-full bg-panel-2 object-cover" />
              )}
              <span className="block p-5">
                <span className="block font-display text-lg font-bold">{t(\`items.\${d.slug}.title\`)}</span>
                <span className="mt-1.5 block text-sm text-muted">{t(\`items.\${d.slug}.short\`)}</span>
                <span className="mt-3 block text-xs text-dim">{d.model} · {d.size}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
`,
);

add(
  "src/app/demos/[slug]/page.tsx",
  `import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { useTranslations } from "next-intl";
import DemoLoader from "@/components/demo/DemoLoader";
import { demoSlugs, getDemo } from "@/lib/content";

export function generateStaticParams() {
  return demoSlugs.map((slug) => ({ slug }));
}

export default function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const meta = getDemo(slug);
  if (!meta) notFound();
  const t = useTranslations("demos");
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:text-text">← All demos</Link>
      <h1 className="mt-4 font-display text-3xl font-bold">{t(\`items.\${meta.slug}.title\`)}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t(\`items.\${meta.slug}.short\`)}</p>
      <p className="mt-1 text-sm text-dim">{meta.model} · {meta.size}</p>
      <div className="mt-6">
        <DemoLoader slug={meta.slug} />
      </div>
    </main>
  );
}
`,
);

add(
  "scripts/fetch-samples.mjs",
  `#!/usr/bin/env node
// Downloads the sample videos and their still frames into public/ (about 20 MB).
// They are free Pexels clips; sources are listed in public/videos/CREDITS.md.
import { mkdir, writeFile } from "node:fs/promises";

const SITE = process.env.SAMPLES_FROM ?? "${SITE}";
const names = ${JSON.stringify(readdirSync(path.join(root, "public/videos")).filter((f) => f.endsWith(".mp4")).map((f) => f.replace(/\.mp4$/, "")))};

await mkdir("public/videos", { recursive: true });
await mkdir("public/posters", { recursive: true });
for (const [dir, ext] of [["videos", "mp4"], ["posters", "jpg"]]) {
  for (const n of names) {
    const res = await fetch(\`\${SITE}/\${dir}/\${n}.\${ext}\`);
    if (!res.ok) throw new Error(\`\${dir}/\${n}.\${ext}: HTTP \${res.status}\`);
    await writeFile(\`public/\${dir}/\${n}.\${ext}\`, Buffer.from(await res.arrayBuffer()));
    console.log(\`saved public/\${dir}/\${n}.\${ext}\`);
  }
}
`,
);
copy("public/videos/CREDITS.md");

add(
  ".gitignore",
  `node_modules
.next
next-env.d.ts
*.tsbuildinfo
public/videos/*.mp4
public/posters
`,
);

add(
  "LICENSE",
  `MIT License

Copyright (c) ${new Date().getFullYear()} Nazar Vision

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This licence covers the code in this folder. AI models are downloaded at run
time from their publishers and keep their own licences (see README.md).
`,
);

// README: the model table comes straight from the demo catalogue.
const content = readFileSync(path.join(root, "src/lib/content.ts"), "utf8");
const rows = [...content.matchAll(/\{ slug: "([^"]+)",[^\n]*?engine: "([^"]+)", model: "([^"]+)", size: "([^"]+)",[^\n]*?repos: \[([^\]]*)\]/g)].map(
  ([, slug, engine, model, size, repos]) =>
    `| ${en.demos.items[slug]?.title ?? slug} | ${model} | ${engine} | ${size} | ${repos
      .split(",")
      .map((r) => r.trim().replace(/"/g, ""))
      .filter(Boolean)
      .map((r) => `[${r}](https://github.com/${r})`)
      .join(", ")} |`,
);
add(
  "README.md",
  `# Computer vision demos

The source code of the in-browser demos on [${SITE.replace("https://", "")}](${SITE}).
Every model runs inside the browser tab (MediaPipe, Transformers.js, Tesseract.js, ZXing);
images and video never leave the device.

## Run it

You need Node.js 20 or newer.

\`\`\`bash
npm install
npm run samples   # downloads the sample videos (about 20 MB)
npm run dev       # open http://localhost:3000
\`\`\`

The webcam needs \`localhost\` or HTTPS. The first run of each demo downloads its model once; after that the browser caches it.

## How it fits together

- \`src/components/demo/DemoStage.tsx\`: the shared stage. It handles the webcam, uploads, sample scenes,
  model loading with progress, and calls a demo's \`onVideoFrame\` (live) or \`onImage\` (stills) with the
  frame already drawn on a canvas.
- \`src/components/demos/*.tsx\`: one file per demo. Each loads its model with \`useModel\`, draws its
  results on the canvas and shows numbers in the side panel.
- \`src/lib/demo/\`: the reusable parts: detectors, MediaPipe and Transformers.js loading, tracking,
  zones, line crossing, speed and wait time, fatigue and PPE logic.
- \`src/lib/content.ts\`: the list of demos, sample files and models.
- \`messages/en.json\`: all text, so the demos can be translated.

To add a demo: copy the closest file in \`src/components/demos\`, register it in
\`src/lib/content.ts\` (\`demoSlugs\` and \`demos\`) and in \`src/components/demo/DemoLoader.tsx\`, and add its
text under \`demos.items\` in \`messages/en.json\`.

## Models

| Demo | Model | Runs on | Download | Based on |
| --- | --- | --- | --- | --- |
${rows.join("\n")}

## Licences

The code in this folder is MIT-licensed (see \`LICENSE\`). Each model is downloaded from its publisher
when a demo first runs and keeps its own licence. Read the model card before using a model in a
commercial product. The sample videos are free Pexels clips; see \`public/videos/CREDITS.md\`.

Need this running on your own cameras, with your own data? Talk to us at ${SITE}.
`,
);

mkdirSync(path.join(root, ".code-kit"), { recursive: true });
const zip = zipSync(files, { level: 9, mtime: new Date("2026-01-01") });
writeFileSync(path.join(root, ".code-kit", `${NAME}.zip`), zip);
console.log(`[code-kit] ${Object.keys(files).length} files, ${Math.round(zip.length / 1024)} KB → .code-kit/${NAME}.zip`);
