import { ArgError, maskDbUrl, parseSeedArgs } from './args'
import { runSeed } from './seed'

function fail(message: string): never {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

let args: ReturnType<typeof parseSeedArgs>
try {
  args = parseSeedArgs(process.argv.slice(2))
} catch (e) {
  if (e instanceof ArgError) fail(`seed: ${e.message}`)
  throw e
}

if (!args.yes) {
  // The seed TRUNCATEs every table it touches, so never wipe a database without a confirmation.
  // Without a TTY there is nobody to answer, so exit instead of blocking a CI job forever.
  if (!process.stdin.isTTY)
    fail('seed: stdin is not a tty; pass --yes to confirm wiping the database')
  process.stdout.write(
    `This will WIPE ${maskDbUrl(args.databaseUrl)} and seed scale=${args.scale}. Continue? [y/N] `,
  )
  const answer = (await new Promise<string>((r) => process.stdin.once('data', (d) => r(String(d)))))
    .trim()
    .toLowerCase()
  if (answer !== 'y') process.exit(1)
}

const summary = await runSeed({
  databaseUrl: args.databaseUrl,
  seed: args.seed,
  scale: args.scale,
  days: args.days,
  demoPassword: process.env.SEED_DEMO_PASSWORD ?? 'demo1234',
  log: console.log,
})
console.table(summary)
process.exit(0)
