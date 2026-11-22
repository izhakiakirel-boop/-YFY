import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {build as esbuild} from 'esbuild';
import fs from 'fs';
import path from 'path';
import {build, defineConfig, type Plugin} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

async function generateStandaloneHtml(rootDir: string): Promise<string> {
  const distIndex = path.resolve(rootDir, 'dist/index.html');
  const distStandalone = path.resolve(rootDir, 'dist/shozrim-olam-3d.html');

  if (!fs.existsSync(distIndex)) {
    await build({
      configFile: path.resolve(rootDir, 'vite.config.ts'),
      logLevel: 'silent',
    });
  }

  const distHtml = fs.readFileSync(distIndex, 'utf-8');
  const styleMatches = distHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const compiledStyles = styleMatches.join('\n');

  const bundled = await esbuild({
    entryPoints: [path.resolve(rootDir, 'src/main.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    plugins: [
      {
        name: 'ignore-css-imports',
        setup(b) {
          b.onLoad({filter: /\.css$/}, () => ({contents: '', loader: 'js'}));
        },
      },
    ],
  });

  const iifeCode = (bundled.outputFiles[0]?.text || '').replace(/<\/script/gi, '<\\/script');
  const sourceIndex = fs.readFileSync(path.resolve(rootDir, 'index.html'), 'utf-8');

  // Strip dev module script and inject compiled styles into <head> and IIFE <script> at end of <body>
  // Use replacement functions so $& / $' / $` inside minified JS/CSS are never interpreted as replace patterns!
  const cleanHtml = sourceIndex
    .replace(/<script[^>]*src=["']\/src\/main\.tsx["'][^>]*>\s*<\/script>/i, () => '')
    .replace(
      /<link\s+href="https:\/\/fonts\.googleapis\.com[^"]*"\s+rel="stylesheet"\s*\/>/is,
      (match) => match.replace('rel="stylesheet"', 'rel="stylesheet" media="print" onload="this.media=\'all\'"'),
    )
    .replace('</head>', () => `${compiledStyles}\n  </head>`)
    .replace('</body>', () => `  <script>\n${iifeCode}\n  </script>\n  </body>`);

  const rootStandalone = path.resolve(rootDir, 'shozrim-olam-3d.html');
  fs.mkdirSync(path.dirname(distStandalone), {recursive: true});
  fs.writeFileSync(distStandalone, cleanHtml, 'utf-8');
  fs.writeFileSync(rootStandalone, cleanHtml, 'utf-8');
  return cleanHtml;
}

function getLatestSrcMtime(dir: string): number {
  let latest = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, getLatestSrcMtime(full));
    } else {
      latest = Math.max(latest, fs.statSync(full).mtimeMs);
    }
  }
  return latest;
}

function standaloneHtmlDownloadPlugin(): Plugin {
  let activeBuildPromise: Promise<string> | null = null;
  return {
    name: 'standalone-html-download',
    async closeBundle(error?: Error): Promise<void> {
      if (error) return;
      await generateStandaloneHtml(__dirname);
    },
    configureServer(server): void {
      server.middlewares.use('/shozrim-olam-3d.html', async (_req, res, next) => {
        try {
          const distStandalone = path.resolve(__dirname, 'dist/shozrim-olam-3d.html');
          const srcMtime = Math.max(
            getLatestSrcMtime(path.resolve(__dirname, 'src')),
            fs.statSync(path.resolve(__dirname, 'index.html')).mtimeMs,
          );
          const needsRebuild =
            !fs.existsSync(distStandalone) || fs.statSync(distStandalone).mtimeMs < srcMtime;

          if (needsRebuild) {
            if (!activeBuildPromise) {
              activeBuildPromise = generateStandaloneHtml(__dirname).finally(() => {
                activeBuildPromise = null;
              });
            }
            await activeBuildPromise;
          }

          const html = fs.readFileSync(distStandalone, 'utf-8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="shozrim-olam-3d.html"');
          res.end(html);
          return;
        } catch (err) {
          return next(err);
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      standaloneHtmlDownloadPlugin(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
