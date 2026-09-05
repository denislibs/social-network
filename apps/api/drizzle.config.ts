import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/db/schema/enums.ts',
    './src/db/schema/identity.ts',
    './src/db/schema/social.ts',
    './src/db/schema/content.ts',
    './src/db/schema/ml.ts',
    './src/db/schema/messaging.ts',
  ],
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://vk:vk@localhost:5432/vk' },
  strict: true,
})
