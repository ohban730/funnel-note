import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  base: '/funnel-note/',
  plugins: [basicSsl()],
});
