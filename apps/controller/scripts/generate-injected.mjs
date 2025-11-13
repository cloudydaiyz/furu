import esbuild from "esbuild"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

async function build() {
  await esbuild.build({
    entryPoints: [
      path.join(ROOT, "src", "playwright", "injected", "src", "injectedScript.ts"),
    ],
    bundle: true,
    outdir: path.join(ROOT, "dist", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'InjectedScriptModule',
    platform: 'browser',
  });

  await esbuild.build({
    entryPoints: [
      path.join(ROOT, "src", "playwright", "injected", "src", "recorder", "recorder.ts"),
    ],
    bundle: true,
    outdir: path.join(ROOT, "dist", "playwright", "injected", "generated"),
    format: 'iife',
    globalName: 'RecorderModule',
    platform: 'browser',
  });
}

build();
