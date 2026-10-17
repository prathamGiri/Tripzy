/** Home: your trips on this phone, or paste an invite link/code. */
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import type { MemberToken } from '@tripzy/shared'
import { getMemberships } from '../lib/session'
import { colors } from '../lib/theme'

export default function Home() {
  const [trips, setTrips] = useState<MemberToken[]>([])
  const [code, setCode] = useState('')

  useFocusEffect(
    useCallback(() => {
      getMemberships().then(setTrips)
    }, []),
  )

  const openInvite = () => {
    const c = code.trim().split('/j/').pop()?.replace(/[^a-z0-9-]/gi, '')
    if (c) router.push(`/j/${c.toLowerCase()}`)
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.h1}>Your whole group.{'\n'}One plan.</Text>
      <Text style={s.sub}>Open an invite from your group chat, or paste the link here.</Text>

      <View style={s.card}>
        <Text style={s.label}>Invite link or code</Text>
        <TextInput
          style={s.input}
          placeholder="tripzy.app/j/goa-k7m3qx"
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={openInvite}
        />
        <Pressable style={s.button} onPress={openInvite}>
          <Text style={s.buttonText}>Open invite</Text>
        </Pressable>
      </View>

      {trips.length > 0 && <Text style={s.section}>Your trips</Text>}
      {trips.map((t) => (
        <Pressable key={t.tripId} style={s.tripRow} onPress={() => router.push(`/trip/${t.tripId}`)}>
          <Text style={s.tripName}>Trip as {t.name}</Text>
          <Text style={s.arrow}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  h1: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -1 },
  sub: { fontSize: 16, color: colors.muted, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  label: { fontWeight: '700', color: colors.ink },
  input: { backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  button: { backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  section: { marginTop: 12, fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  tripRow: { backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  tripName: { flex: 1, fontWeight: '700', fontSize: 16 },
  arrow: { fontSize: 24, color: colors.muted },
})
