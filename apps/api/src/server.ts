import { env } from './config/env'
import { buildApp } from './app'
import { getPlanner } from './modules/ai'
import { failOrphanedJobs } from './modules/plans/service'

const app = await buildApp()
await failOrphanedJobs()

const planner = getPlanner()
await app.listen({ port: env.PORT, host: env.HOST })
app.log.info(`AI planner: ${planner.name}${planner.model ? ` (${planner.model})` : ''} · demo mode: ${env.demoMode ? 'on' : 'off'}`)
