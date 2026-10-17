/** Member tokens are stored in the device keychain (SecureStore), one per trip. */
import * as SecureStore from 'expo-secure-store'
import type { MemberToken } from '@tripzy/shared'

const KEY = 'tripzy.memberships'

export async function getMemberships(): Promise<MemberToken[]> {
  const raw = await SecureStore.getItemAsync(KEY)
  return raw ? (JSON.parse(raw) as MemberToken[]) : []
}

export async function saveMembership(m: MemberToken) {
  const all = (await getMemberships()).filter((x) => x.tripId !== m.tripId)
  await SecureStore.setItemAsync(KEY, JSON.stringify([m, ...all]))
}

export async function membershipFor(tripId: string) {
  return (await getMemberships()).find((m) => m.tripId === tripId) ?? null
}
