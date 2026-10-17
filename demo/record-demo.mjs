// Records a full product walkthrough as demo/video/tripzy-demo.mp4.
// Needs the app running with the offline planner so generation is quick:
//   AI_PROVIDER=mock npm run dev        (from the repo root)
// then: cd demo && npm install && npm run record
import { chromium } from 'playwright-core'
import ffmpegPath from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT_DIR = path.resolve('video')
const RAW_DIR = path.join(OUT_DIR, 'raw')
rmSync(RAW_DIR, { recursive: true, force: true })
mkdirSync(RAW_DIR, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
})
const page = await context.newPage()
const t0 = Date.now()
const wait = (ms) => page.waitForTimeout(ms)
const stage = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args])

await page.goto(`${BASE}/demo-stage.html`)
await page.evaluate(() => localStorage.clear()) // start as a brand-new visitor
await page.evaluate(() => document.fonts.ready)

/* ---------- title card ---------- */
await stage(
  'card',
  `<div class="logo"><i>🌴</i>tripzy</div>
   <div class="big">Your whole group.<br/>One plan.<br/><span class="grad">Under 10 minutes.</span></div>
   <div class="sub">Product walkthrough</div>`,
)
await page.evaluate(() => (document.getElementById('app').src = '/'))
await page.waitForFunction(() => document.getElementById('app').contentDocument?.querySelector('h1'))
const frame = page.frames().find((f) => f !== page.mainFrame())
const app = page.frameLocator('#app')
await wait(3500)
await stage('hideCard')
await wait(700)

/* ---------- helpers ---------- */
const scrollBy = async (y, ms = 1200) => {
  await frame.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), y)
  await wait(ms)
}
const scrollTo = async (y, ms = 1000) => {
  await frame.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y)
  await wait(ms)
}
/** Bring an element comfortably into view (clear of the sticky header/footer), show a tap ripple, click. */
async function tap(loc, pause = 600) {
  await loc.waitFor()
  const moved = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const fixed = getComputedStyle(el.closest('.sticky, .fixed') ?? document.body).position
    if (fixed === 'sticky' || fixed === 'fixed') return false
    if (r.top > 110 && r.bottom < window.innerHeight - 150) return false
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return true
  })
  if (moved) await wait(800)
  const b = await loc.boundingBox()
  await page.evaluate(([x, y]) => window.stage.tap(x, y), [b.x + b.width / 2, b.y + b.height / 2])
  await wait(220)
  await loc.click()
  await wait(pause)
}
const btn = (name) => app.getByRole('button', { name }).first()
const goto = async (p) => {
  await frame.evaluate((to) => {
    history.pushState({}, '', to)
    dispatchEvent(new PopStateEvent('popstate'))
  }, p)
  await wait(500)
}

/* ---------- 0. the problem ---------- */
await stage('chapter', 0, 'Group trips die in the group chat', 'Endless WhatsApp threads. Nobody agrees on dates or budget. Friends drop out one by one — and the trip never happens.')
await wait(3500)
await scrollBy(900, 1500)
await wait(2500)
await scrollBy(650, 1500)
await stage('caption', 'Tripzy’s promise: <b>everyone answers once, and the group gets one complete plan — in minutes, not weeks.</b>')
await wait(2500)
await scrollBy(900, 1500)
await wait(1500)
await scrollTo(0, 1500)

/* ---------- 1. create ---------- */
await stage('chapter', 1, 'Create the trip in a minute', 'The organizer picks a destination — or lets Tripzy suggest one — a rough date window, trip length and group size.')
await page.evaluate(() => window.stage.startClock())
await tap(btn(/^Plan a trip$/), 900)
const nameInput = app.locator('input').first()
await tap(nameInput, 200)
await nameInput.fill('')
await nameInput.pressSequentially('Goa with the gang', { delay: 65 })
await wait(500)
await tap(btn(/Snow, pine forests/), 500)
await tap(btn(/Beaches, shacks/), 700)
await tap(btn(/^Mumbai$/), 500)
await scrollBy(420)
await tap(btn(/Mid-Dec/), 700)
await scrollBy(300)
await stage('caption', 'Friends only need a rough window — they’ll pick the exact days they’re free.')
await tap(app.locator('button:has(svg.lucide-plus)').nth(1), 400)
await wait(800)
await tap(btn(/Create trip/), 1200)

/* ---------- 2. invite ---------- */
await stage('chapter', 2, 'Share one link', 'Drop it in the group chat. Friends open it on their phone — no app, no sign-up.')
await wait(1200)
await tap(btn(/^Copy$/), 1800)
await scrollBy(350)
await wait(1800)

/* ---------- 3. organizer preferences ---------- */
await stage('chapter', 3, 'Everyone answers once — in 90 seconds', 'Budget, travel style, interests, food and free dates. <b>Budgets stay private</b> — the group only sees the range.')
await tap(btn(/Add my own preferences/), 1200)
await tap(btn(/^₹20,000$/), 900)
await tap(btn(/^Next/), 900)
await tap(btn(/Relaxed/), 1300)
for (const i of [/Beaches$/, /Food$/, /Nightlife$/]) await tap(btn(i), 350)
await wait(500)
await tap(btn(/^Next/), 900)
await tap(btn(/eat everything/), 500)
await tap(btn(/^Next/), 900)
for (const d of ['16', '17', '18', '19', '20', '21']) await tap(app.locator('.grid-cols-7 button').filter({ hasText: new RegExp(`^${d}`) }).first(), 150)
await wait(600)
await tap(btn(/Submit/), 2600)

/* ---------- 4. a friend joins ---------- */
await stage('chapter', 4, 'Friends join from the group chat', 'Kabir taps the link on WhatsApp. One welcome screen, five quick taps — done.')
await frame.evaluate(() => window.__setUser('Kabir'))
await goto('/join')
await wait(2200)
await tap(btn(/Let’s go/), 900)
await tap(btn(/^₹20,000$/), 600)
await tap(btn(/^Next/), 800)
await tap(btn(/Adventure/), 1300)
for (const i of [/Adventure$/, /Nature$/, /Food$/]) await tap(btn(i), 300)
await tap(btn(/^Next/), 800)
await tap(btn(/^Vegetarian$/), 500)
await tap(btn(/^Next/), 800)
await tap(btn(/flexible/), 600)
await tap(btn(/Submit/), 2600)

/* ---------- 5. dashboard ---------- */
await stage('chapter', 5, 'See where the group overlaps', 'Who’s in and who isn’t, the dates everyone is free, the budget range and shared interests — at a glance.')
await frame.evaluate(() => window.__setUser('Arjun'))
await goto('/dashboard')
await wait(1800)
await tap(btn(/Nudge/), 1600)
await scrollBy(560, 1400)
await wait(1500)
await scrollBy(520, 1400)
await stage('caption', 'Tripzy plans to the <b>tightest budget</b>, so nobody is stretched — and nobody has to say their number out loud.')
await wait(2000)
await scrollBy(500, 1400)
await wait(1500)

/* ---------- 6. generate ---------- */
await stage('chapter', 6, 'Generate the plan', 'Dates, budgets, interests and food needs — fitted into one complete trip.')
await tap(btn(/Generate plan/), 300)
await page.waitForFunction(() => document.getElementById('app').contentWindow.location.pathname === '/plan', null, { timeout: 120_000 })
await wait(800)

/* ---------- 7. plan, vote, swap ---------- */
await stage('chapter', 7, 'Agree fast — vote and swap', 'A day-by-day itinerary with times, places, travel and a note on why each pick fits the group.')
await wait(2500)
await scrollBy(330, 1200)
await wait(800)
await scrollBy(420, 1200)
await tap(app.getByRole('button', { name: 'Thumbs up' }).nth(1), 900)
await stage('caption', 'Instead of debating in chat, everyone taps 👍 / 👎 — or swaps an activity for an alternative.')
await tap(btn(/^Swap$/), 1600)
await tap(btn(/Sunset at Vagator Beach/), 1500)
await scrollBy(700, 1400)
await wait(1000)
await scrollBy(700, 1400)
await wait(800)

await scrollTo(300, 900)
await stage('caption', 'Stay options sized for the whole group, priced per person.')
await tap(btn(/^Stay$/), 1500)
await scrollBy(450, 1300)
await wait(800)
await scrollTo(300, 900)
await stage('caption', 'Getting there and getting around — every leg priced.')
await tap(btn(/^Travel$/), 2200)
await stage('caption', 'And the full cost per person, shown against the group’s budget.')
await tap(btn(/^Cost$/), 1800)
await scrollBy(300, 1200)
await wait(2200)

/* ---------- 8. locked ---------- */
await stage('chapter', 8, 'Trip locked 🔒', 'One agreed plan, ready to share back to the group — before the chat goes quiet.')
await tap(btn(/Lock the trip/), 300)
const planned = await page.evaluate(() => document.getElementById('clock').textContent)
await page.evaluate(() => window.stage.stopClock())
await wait(3500)
await scrollBy(550, 1500)
await wait(1500)
await tap(btn(/^Copy$/), 2000)

/* ---------- outro ---------- */
await stage(
  'card',
  `<div class="logo"><i>🌴</i>tripzy</div>
   <div class="big">Weeks of chat →<br/><span class="grad">one plan in ${planned}.</span></div>
   <div class="sub">Your whole group. One plan. Under 10 minutes.</div>
   <div class="pill">Clickable prototype · sample data · prices in ₹</div>`,
)
await wait(5000)

const video = page.video()
await context.close()
await browser.close()
const raw = await video.path()
console.log(`Recorded ${((Date.now() - t0) / 1000).toFixed(0)}s → ${raw}`)

const mp4 = path.join(OUT_DIR, 'tripzy-demo.mp4')
execFileSync(ffmpegPath, ['-y', '-i', raw, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
console.log('Saved', mp4, readdirSync(OUT_DIR))
