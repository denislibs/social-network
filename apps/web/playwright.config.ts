import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'sh -c "set -a; . ../../.env; set +a; bun run --cwd ../api start"',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'bun run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
