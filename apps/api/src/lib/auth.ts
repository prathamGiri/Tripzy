/**
 * "No sign-up" identity: every member gets a secret token when they create or join a trip.
 * Requests send it as `Authorization: Bearer <token>`.
 */
import type { FastifyRequest } from 'fastify'
import type { Member } from '@prisma/client'
import { db } from './db'
import { HttpError } from './http'

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : null
}

/** The member making the request, who must belong to `tripId`. */
export async function requireMember(req: FastifyRequest, tripId: string): Promise<Member> {
  const token = bearer(req)
  if (!token) throw new HttpError(401, 'Missing member token')
  const member = await db.member.findUnique({ where: { token } })
  if (!member || member.tripId !== tripId) throw new HttpError(403, 'Not a member of this trip')
  return member
}

export async function requireOrganizer(req: FastifyRequest, tripId: string): Promise<Member> {
  const m = await requireMember(req, tripId)
  if (!m.isOrganizer) throw new HttpError(403, 'Only the organizer can do this')
  return m
}
