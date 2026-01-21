import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'copy-manifest',
          closeBundle() {
            const distPath = path.resolve(__dirname, 'dist');
            mkdirSync(distPath, { recursive: true });
            
            // Копируем manifest.json в dist
            const manifestPath = path.resolve(__dirname, 'manifest.json');
            if (existsSync(manifestPath)) {
              copyFileSync(manifestPath, path.join(distPath, 'manifest.json'));
            }
            
            // Копируем background.js в dist
            const backgroundPath = path.resolve(__dirname, 'background.js');
            if (existsSync(backgroundPath)) {
              copyFileSync(backgroundPath, path.join(distPath, 'background.js'));
            }
            
            // Копируем иконки в dist/icons
            const iconsDir = path.resolve(__dirname, 'icons');
            const distIconsDir = path.join(distPath, 'icons');
            if (existsSync(iconsDir)) {
              mkdirSync(distIconsDir, { recursive: true });
              ['16.png', '48.png', '128.png'].forEach(icon => {
                const iconPath = path.join(iconsDir, icon);
                if (existsSync(iconPath)) {
                  copyFileSync(iconPath, path.join(distIconsDir, icon));
                }
              });
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.CEREBRAS_API_KEY || ''),
        'process.env.CEREBRAS_API_KEY': JSON.stringify(env.CEREBRAS_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]'
          }
        }
      }
    };
});
