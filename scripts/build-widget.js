const { build } = require('esbuild');
const { execSync } = require('child_process');

async function bundle() {
  await build({
    entryPoints: ['frontend/widget/index.tsx'],
    outfile: 'public/chatbot.js',
    bundle: true,
    format: 'iife',
    globalName: 'KommanderWidget',
    external: ['react', 'react-dom'],
    jsx: 'transform',
    jsxImportSource: 'react',
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
  });

  execSync(
    'npx tailwindcss -i app/globals.css -o public/chatbot.css --minify --content "frontend/components/chatbot/**/*.{ts,tsx}" "frontend/hooks/useWidgetChat.ts"',
    { stdio: 'inherit' }
  );
}

bundle().catch((err) => {
  console.error(err);
  process.exit(1);
});
