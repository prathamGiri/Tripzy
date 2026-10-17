/** All configuration comes from environment variables (apps/api/.env locally). Validated once at startup. */
import 'dotenv/config'
import { z } from 'zod'

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('*'),
  PUBLIC_WEB_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),

  AI_PROVIDER: z.enum(['openai', 'mock']).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.5'),
  OPENAI_REASONING_EFFORT: z
    .enum(['low', 'medium', 'high', ''])
    .optional()
    .transform((v) => v || undefined),

  DEMO_MODE: bool,
  BOOKING_AFFILIATE_ID: z.string().optional(),
  MAKEMYTRIP_AFFILIATE_ID: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const raw = parsed.data

export const env = {
  ...raw,
  /** OpenAI is used when explicitly chosen (or by default) and a key exists; otherwise the mock planner. */
  aiProvider: (raw.AI_PROVIDER === 'mock' || !raw.OPENAI_API_KEY ? 'mock' : 'openai') as 'openai' | 'mock',
  demoMode: raw.DEMO_MODE,
  corsOrigins: raw.CORS_ORIGINS === '*' ? true : raw.CORS_ORIGINS.split(',').map((s) => s.trim()),
  affiliates: { booking: raw.BOOKING_AFFILIATE_ID || undefined, makemytrip: raw.MAKEMYTRIP_AFFILIATE_ID || undefined },
}
