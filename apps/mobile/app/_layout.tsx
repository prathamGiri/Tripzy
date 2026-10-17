import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colors } from '../lib/theme'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Tripzy' }} />
        <Stack.Screen name="j/[code]" options={{ title: 'You’re invited' }} />
        <Stack.Screen name="trip/[id]" options={{ title: 'Your trip' }} />
      </Stack>
    </>
  )
}
