import { parseArgs } from 'node:util'
import { runSeed } from './seed'

const { values } = parseArgs({
  options: {
    scale: { type: 'string', default: '1' },
    seed: { type: 'string', default: '42' },
    days: { type: 'string', default: '90' },
    yes: { type: 'boolean', default: false },
    url: { type: 'string' },
  },
})
const databaseUrl = values.url ?? process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL or --url required')
if (!values.yes) {
  // The seed TRUNCATEs every table it touches, so never wipe a database without a confirmation.
  process.stdout.write(
    `This will WIPE ${databaseUrl} and seed scale=${values.scale}. Continue? [y/N] `,
  )
  const answer = (await new Promise<string>((r) => process.stdin.once('data', (d) => r(String(d)))))
    .trim()
    .toLowerCase()
  if (answer !== 'y') process.exit(1)
}
const summary = await runSeed({
  databaseUrl,
  seed: Number(values.seed),
  scale: Number(values.scale),
  days: Number(values.days),
  demoPassword: process.env.SEED_DEMO_PASSWORD ?? 'demo1234',
  log: console.log,
})
console.table(summary)
process.exit(0)
