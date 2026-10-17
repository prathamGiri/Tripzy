/** Opened by invite deep links (tripzy://j/CODE or https://tripzy.app/j/CODE): preview the trip and join. */
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { fmtRange, type InvitePreview } from '@tripzy/shared'
import { api } from '../../lib/api'
import { membershipFor, saveMembership } from '../../lib/session'
import { colors } from '../../lib/theme'

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .invite(code)
      .then(async (p) => {
        if (await membershipFor(p.tripId)) router.replace(`/trip/${p.tripId}`)
        else setPreview(p)
      })
      .catch((e: Error) => setError(e.message))
  }, [code])

  if (error) return <Text style={[s.page, s.error]}>{error}</Text>
  if (!preview) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />

  const join = async () => {
    setBusy(true)
    try {
      const m = await api.join(code, name.trim())
      await saveMembership(m)
      router.replace(`/trip/${m.tripId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.page}>
      <View style={s.hero}>
        <Text style={s.heroSmall}>{preview.organizerName} invited you</Text>
        <Text style={s.heroTitle}>{preview.tripName}</Text>
        <Text style={s.heroSmall}>
          {preview.destinationQuery ?? 'Destination picked by the group'} · {preview.days} days · {fmtRange(preview.windowStart, preview.windowEnd)}
        </Text>
        <Text style={[s.heroSmall, { marginTop: 12 }]}>
          {preview.respondedCount} of {preview.groupSize} already in
        </Text>
      </View>
      <Text style={s.label}>Your name</Text>
      <TextInput style={s.input} placeholder="e.g. Kabir" value={name} onChangeText={setName} maxLength={40} />
      <Pressable style={[s.button, (!name.trim() || busy) && { opacity: 0.4 }]} disabled={!name.trim() || busy} onPress={join}>
        <Text style={s.buttonText}>{busy ? 'Joining…' : 'Join the trip'}</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  error: { color: '#dc2626', fontWeight: '600' },
  hero: { backgroundColor: colors.brand, borderRadius: 28, padding: 22, marginBottom: 8 },
  heroSmall: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: '800', marginVertical: 6 },
  label: { fontWeight: '700', color: colors.ink },
  input: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: colors.line },
  button: { backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
})
