/**
 * Trip overview: who's in, where the group overlaps, and the plan summary with booking links.
 * Phase 2 adds the native preference form, voting and swaps (see docs/mobile-plan.md);
 * until then those open on the website.
 */
import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { applySwaps, costBreakdown, fmtRange, inr, type TripView } from '@tripzy/shared'
import { api, WEB_URL } from '../../lib/api'
import { membershipFor } from '../../lib/session'
import { colors } from '../../lib/theme'

export default function Trip() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [trip, setTrip] = useState<TripView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const m = await membershipFor(id)
    if (!m) return setError('You are not part of this trip on this phone.')
    try {
      setTrip(await api.getTrip(id, m.token))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  if (error) return <Text style={[s.page, { color: '#dc2626' }]}>{error}</Text>
  if (!trip) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />

  const ov = trip.overlap
  const plan = trip.plan
  const doc = plan?.doc
  const stay = doc?.stays.find((x) => x.id === plan!.stayId)
  const transport = doc?.transports.find((x) => x.id === plan!.transportId)
  const total = doc && stay && transport ? costBreakdown(doc, applySwaps(doc.days, plan!.swaps), stay, transport).total : null

  return (
    <ScrollView
      contentContainerStyle={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <Text style={s.h1}>{trip.name}</Text>
      <Text style={s.sub}>
        {trip.destinationQuery ?? 'AI picks the destination'} · {trip.days} days · {trip.groupSize} people
      </Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>
          {ov.respondedCount} of {trip.groupSize} have answered
        </Text>
        {trip.members.map((m) => (
          <Text key={m.id} style={s.row}>
            {m.responded ? '✅' : '⏳'} {m.name}
            {m.isOrganizer ? ' (organizer)' : ''}
          </Text>
        ))}
      </View>

      {ov.respondedCount > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Where the group overlaps</Text>
          {ov.best && <Text style={s.row}>📅 {fmtRange(ov.best.dates[0], ov.best.dates[ov.best.dates.length - 1])}</Text>}
          <Text style={s.row}>
            💰 {inr(ov.budget.min)} – {inr(ov.budget.max)} per person
          </Text>
          <Text style={s.row}>❤️ {ov.interests.slice(0, 3).map((i) => i.key).join(', ')}</Text>
        </View>
      )}

      {doc && stay && transport && (
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {doc.destination.emoji} {doc.destination.name} · {inr(total!)} per person
          </Text>
          {doc.days.map((d, i) => (
            <Text key={d.date} style={s.row}>
              Day {i + 1}: {d.title}
            </Text>
          ))}
          <Text style={[s.cardTitle, { marginTop: 8 }]}>Book it</Text>
          {[...transport.links, ...stay.links].map((l) => (
            <Pressable key={l.url} style={s.link} onPress={() => Linking.openURL(l.url)}>
              <Text style={s.linkText}>{l.label} ↗</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!trip.me.prefs && (
        <Pressable style={s.button} onPress={() => Linking.openURL(`${WEB_URL}/j/${trip.inviteCode}`)}>
          <Text style={s.buttonText}>Add my preferences</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  h1: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 15, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.line },
  cardTitle: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 4 },
  row: { fontSize: 15, color: colors.ink },
  link: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  linkText: { color: colors.white, fontWeight: '700' },
  button: { backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
})
