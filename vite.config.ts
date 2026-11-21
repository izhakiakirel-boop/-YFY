import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {build, defineConfig, type Plugin} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

function standaloneHtmlDownloadPlugin(): Plugin {
  let isBuildingStandalone = false;
  return {
    name: 'standalone-html-download',
    closeBundle(error?: Error): void {
      if (error) return;
      const distIndex = path.resolve(__dirname, 'dist/index.html');
      const distStandalone = path.resolve(__dirname, 'dist/shozrim-olam-3d.html');
      if (fs.existsSync(distIndex)) {
        fs.copyFileSync(distIndex, distStandalone);
      }
    },
    configureServer(server): void {
      server.middlewares.use('/shozrim-olam-3d.html', async (_req, res, next) => {
        try {
          const distStandalone = path.resolve(__dirname, 'dist/shozrim-olam-3d.html');
          if (!fs.existsSync(distStandalone) && !isBuildingStandalone) {
            isBuildingStandalone = true;
            try {
              await build({
                configFile: path.resolve(__dirname, 'vite.config.ts'),
                logLevel: 'silent',
              });
            } finally {
              isBuildingStandalone = false;
            }
          }
          if (fs.existsSync(distStandalone)) {
            const html = fs.readFileSync(distStandalone, 'utf-8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="shozrim-olam-3d.html"');
            res.end(html);
            return;
          }
        } catch (err) {
          return next(err);
        }
        next();
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
