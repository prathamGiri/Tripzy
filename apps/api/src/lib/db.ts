import { PrismaClient } from '@prisma/client'

export const db = new PrismaClient()

/** JSON columns are stored as text (works on SQLite and Postgres). */
export const toJson = (v: unknown) => JSON.stringify(v)
export const fromJson = <T>(s: string | null | undefined): T | null => (s ? (JSON.parse(s) as T) : null)
