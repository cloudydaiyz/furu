import esbuild from "esbuild"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

async function build() {
  await esbuild.build({
    entryPoints: [
      path.join(ROOT, "src", "vendor", "playwright", "injected", "src", "injectedScript.ts"),
    ],
    bundle: true,
    outdir: path.join(ROOT, "dist", "vendor", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'injectedScriptModule',
    platform: 'browser',
  });

  await esbuild.build({
    entryPoints: [
      path.join(ROOT, "src", "vendor", "playwright", "injected", "src", "recorder", "recorder.ts"),
    ],
    bundle: true,
    outdir: path.join(ROOT, "dist", "vendor", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'recorderModule',
    platform: 'browser',
  });

  await esbuild.build({
    entryPoints: [
      path.join(ROOT, "src", "vendor", "playwright", "injected", "src", "recorder", "oldRecorder.ts"),
    ],
    bundle: true,
    outdir: path.join(ROOT, "dist", "vendor", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'recorderModule',
    platform: 'browser',
  });
}

build();
