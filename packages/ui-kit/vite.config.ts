import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({ root: 'catalog', plugins: [solid()], server: { port: 5174 } })
