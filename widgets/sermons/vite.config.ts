import { defineConfig } from 'vite';
import { perimeterWidget } from '@perimeter/vite-plugin-widget';

export default defineConfig({
  plugins: [perimeterWidget({ name: 'sermons', entry: 'src/index.tsx' })],
  build: { outDir: '../../dist/sermons' },
});
