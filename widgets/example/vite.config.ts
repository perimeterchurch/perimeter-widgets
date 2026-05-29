import { defineConfig } from 'vite';
import { perimeterWidget } from '@perimeter/vite-plugin-widget';

export default defineConfig({
  plugins: [perimeterWidget({ name: 'example', entry: 'src/index.tsx' })],
  build: { outDir: '../../dist/example' },
});
