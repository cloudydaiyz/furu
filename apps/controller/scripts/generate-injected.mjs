import esbuild from "esbuild"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

async function build() {
  const buildOutput = await esbuild.build({
    entryPoints: [path.join(ROOT, "src", "playwright", "injected", "src", "injectedScript.ts")],
    bundle: true,
    outdir: path.join(ROOT, "dist", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'PlaywrightInjected',
    // format: 'cjs',
    platform: 'browser',
    // target: 'ES2019',
  });
}

build();
