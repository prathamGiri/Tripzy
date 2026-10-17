# Mobile app plan

**Stack:** Expo (React Native) + Expo Router, in `apps/mobile`. It reuses `packages/shared` (types, maths, `TripzyApi` client) and talks to the same API as the website. One codebase → iOS and Android.

## What exists now (skeleton)

| Screen | File | Status |
|---|---|---|
| Home: your trips, paste an invite | `app/index.tsx` | ✅ |
| Join from invite (deep link `tripzy://j/CODE` and `https://tripzy.app/j/CODE`) | `app/j/[code].tsx` | ✅ |
| Trip overview: members, overlap, plan summary, **Book it** links | `app/trip/[id].tsx` | ✅ |
| Preferences, voting, swaps | — | opens the website for now |

Tokens are stored in the device keychain (`lib/session.ts`, SecureStore).

> The skeleton has not been run on a device yet — Expo dependencies are not installed by `npm run setup` (they're large). Expect to run `npx expo install --fix` once to align versions with the current Expo SDK.

## Run it

```bash
cd apps/mobile
npm install
npx expo install --fix     # align native package versions with your Expo SDK
npm start                  # scan the QR code with Expo Go
```

Set `extra.apiUrl` in `app.json` to your computer's LAN address (e.g. `http://192.168.1.4:8787`) so the phone can reach the API, and run the API with `HOST=0.0.0.0` (the default).

## Roadmap

**Phase 2 — feature parity (≈ 2–3 weeks)**
- Native 5-step preference form (reuse `PreferencesSchema` for validation).
- Dashboard, plan tabs, 👍/👎 and swap sheet (same data as the web screens).
- Share sheet for the invite link (`expo-sharing` / native share).

**Phase 3 — mobile-only value**
- Push notifications via Expo Notifications: "Plan ready", "Arjun nudged you", "Trip locked". Needs a `push_token` column on `Member` and a small `notifications` module in the API.
- Add trip dates to the phone calendar (`expo-calendar`).
- Offline access to the locked plan (cache the last `TripView`).

**Phase 4 — store release**
- EAS Build + Submit, app icons/splash, privacy labels.
- Universal links: host `apple-app-site-association` and `assetlinks.json` on `tripzy.app` so invite links open the app when installed and the website otherwise.

Until then the website is mobile-first and works well when opened from WhatsApp.
