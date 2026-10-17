import { TripzyApi } from '@tripzy/shared'

/** One API client for the whole site. In dev, /api is proxied to the API server by Vite. */
export const api = new TripzyApi(import.meta.env.VITE_API_URL ?? '/api')

/** Demo tools (person switcher, jump-to-screen) — on unless VITE_DEMO_TOOLS=false. Also needs DEMO_MODE on the API. */
export const DEMO_TOOLS = import.meta.env.VITE_DEMO_TOOLS !== 'false'
