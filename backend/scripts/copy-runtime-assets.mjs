import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const assetDirectories = [
  { from: path.join(backendRoot, 'src', 'data'), to: path.join(backendRoot, 'dist', 'data') },
];

async function copyAssets() {
  for (const assetDirectory of assetDirectories) {
    try {
      const sourceStats = await stat(assetDirectory.from);
      if (!sourceStats.isDirectory()) continue;

      await mkdir(assetDirectory.to, { recursive: true });
      await cp(assetDirectory.from, assetDirectory.to, { recursive: true, force: true });
      console.log(`[copy-runtime-assets] copied ${path.relative(backendRoot, assetDirectory.from)} -> ${path.relative(backendRoot, assetDirectory.to)}`);
    } catch (error) {
      console.warn(`[copy-runtime-assets] skipped ${path.relative(backendRoot, assetDirectory.from)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await copyAssets();
