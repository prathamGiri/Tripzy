/** Builds the Fastify app. Each feature module registers its own routes. */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env'
import { HttpError } from './lib/http'
import { demoRoutes } from './modules/demo/routes'
import { memberRoutes } from './modules/members/routes'
import { planRoutes } from './modules/plans/routes'
import { tripRoutes } from './modules/trips/routes'
import { voteRoutes } from './modules/votes/routes'
import { getPlanner } from './modules/ai'

export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? { level: 'info', transport: undefined } })

  await app.register(cors, { origin: env.corsOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.message, details: err.details })
    if ((err as { validation?: unknown }).validation) return reply.code(400).send({ error: err.message })
    req.log.error(err)
    return reply.code(500).send({ error: 'Something went wrong on our side' })
  })
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'Not found' }))

  app.get('/health', async () => {
    const p = getPlanner()
    return { ok: true, ai: p.model ? `${p.name}:${p.model}` : p.name, demo: env.demoMode }
  })

  await app.register(tripRoutes)
  await app.register(memberRoutes)
  await app.register(planRoutes)
  await app.register(voteRoutes)
  if (env.demoMode) await app.register(demoRoutes)

  return app
}
