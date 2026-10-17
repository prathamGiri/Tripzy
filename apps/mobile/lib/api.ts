import Constants from 'expo-constants'
import { TripzyApi } from '@tripzy/shared'

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; webUrl?: string }

/** Your computer's LAN address while developing (set in app.json → extra.apiUrl); the real API URL in production. */
export const api = new TripzyApi(extra.apiUrl ?? 'http://localhost:8787')
export const WEB_URL = extra.webUrl ?? 'http://localhost:5173'
