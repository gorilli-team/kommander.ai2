import { build } from 'esbuild';
import { copyFileSync } from 'fs';
import path from 'path';

async function run() {
  const root = process.cwd();
  await build({
    entryPoints: [path.join(root, 'frontend/widget/index.tsx')],
    bundle: true,
    format: 'iife',
    outfile: path.join(root, 'public/chatbot.js'),
    platform: 'browser',
    external: ['react', 'react-dom'],
    minify: true,
  });

  copyFileSync(
    path.join(root, 'frontend/widget/style.css'),
    path.join(root, 'public/chatbot.css')
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
