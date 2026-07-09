import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: 'event-finder' }));
