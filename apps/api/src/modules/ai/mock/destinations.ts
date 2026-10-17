import type { Destination, TransportOption } from './types'

const t = (
  id: string,
  mode: TransportOption['mode'],
  label: string,
  duration: string,
  depart: string,
  price: number,
  note: string,
): TransportOption => ({ id, mode, label, duration, depart, price, note })

/* ------------------------------------------------------------------ */
/* GOA                                                                 */
/* ------------------------------------------------------------------ */

const goa: Destination = {
  id: 'goa',
  name: 'Goa',
  region: 'North Goa · Anjuna & Vagator base',
  emoji: '🏖️',
  gradient: 'from-orange-400 via-brand-500 to-pink-500',
  tagline: 'Beaches, shacks, forts and long nights',
  bestFor: ['beaches', 'nightlife', 'party', 'food', 'relaxed'],
  foodPerDay: { budget: 900, mid: 1400, premium: 2400 },
  getThere: {
    Mumbai: [
      t('goa-mum-fl', 'flight', 'Non-stop flight BOM → GOX', '1h 15m', '07:05', 4200, 'Lands 08:20 at Mopa — 45 min to Anjuna'),
      t('goa-mum-tr', 'train', 'Konkan Kanya Express · 3AC', '11h overnight', '23:05', 1350, 'Sleep on the train, wake up at Thivim'),
      t('goa-mum-bus', 'bus', 'AC sleeper Volvo', '12h overnight', '20:30', 1200, 'Drops at Mapusa, 20 min from stay'),
    ],
    Delhi: [
      t('goa-del-fl', 'flight', 'Non-stop flight DEL → GOX', '2h 35m', '06:10', 6800, 'Earliest flight, arrive before lunch'),
      t('goa-del-tr', 'train', 'Goa Express · 3AC', '27h', '15:00', 2750, 'Long but scenic through the Ghats'),
    ],
    Bengaluru: [
      t('goa-blr-fl', 'flight', 'Non-stop flight BLR → GOX', '1h 10m', '08:40', 3900, 'Cheapest morning slot this week'),
      t('goa-blr-tr', 'train', 'Vasco Express · 3AC', '14h overnight', '20:00', 1150, 'Arrives Madgaon 10:00'),
      t('goa-blr-bus', 'bus', 'AC sleeper Volvo', '11h overnight', '21:15', 1300, 'Drops at Panjim'),
    ],
    Pune: [
      t('goa-pnq-fl', 'flight', 'Non-stop flight PNQ → GOX', '1h 05m', '09:15', 4500, 'Short hop, minimal leave needed'),
      t('goa-pnq-bus', 'bus', 'AC sleeper Volvo', '10h overnight', '21:00', 1100, 'Wake up in Mapusa'),
    ],
  },
  stays: [
    {
      id: 'goa-stay-hostel', name: 'Salt House Hostel — private 6-bed room', area: 'Vagator', emoji: '🛏️',
      kind: 'Hostel · private room', tier: 'budget', pricePerNight: 900, rating: 4.5,
      perks: ['Private room for the group', 'Rooftop café', '5 min to Vagator beach'],
      why: 'Keeps everyone well under budget and close to the action.',
    },
    {
      id: 'goa-stay-villa', name: 'Casa Anjuna — 3BHK pool villa', area: 'Anjuna', emoji: '🏡',
      kind: 'Private villa', tier: 'mid', pricePerNight: 1800, rating: 4.7,
      perks: ['Private pool', 'Full kitchen', 'Caretaker & daily cleaning', 'Scooters on request'],
      why: 'A private pool villa costs less per head than separate hotel rooms — and the group stays together.',
    },
    {
      id: 'goa-stay-resort', name: 'Cliffside Resort & Spa', area: 'Vagator', emoji: '🌺',
      kind: '5-star resort', tier: 'premium', pricePerNight: 6200, rating: 4.8,
      perks: ['Sea-view rooms', 'Infinity pool', 'Spa', 'Breakfast included'],
      why: 'Splurge option if the group wants pure comfort.',
    },
  ],
  arrival: {
    id: 'goa-arrive', title: 'Arrive, settle in, first sunset', tags: ['relaxed'],
    items: [
      { id: 'g-a1', time: '11:30', emoji: '👋', title: 'Everyone meets up', place: 'Mopa Airport / Thivim station', cost: 0, tags: [],
        why: 'Arrivals are timed within a 2-hour window so nobody waits around.' },
      { id: 'g-a2', time: '13:00', emoji: '🏡', title: 'Check in + lunch at the stay', place: 'Anjuna', cost: 0, tags: ['relaxed', 'food'],
        travel: { mode: 'Prepaid cab', mins: 50, cost: 450 },
        why: 'Drop bags, eat, nap. No rushing on day one.' },
      { id: 'g-a3', time: '15:30', emoji: '🛵', title: 'Pick up scooters for the trip', place: 'Anjuna main road', cost: 700, tags: ['adventure'],
        why: '₹350/day, 2 per scooter — the cheapest, fastest way around North Goa.' },
      { id: 'g-a4', time: '17:30', emoji: '🌅', title: 'Sunset at Chapora Fort', place: 'Chapora', cost: 0, tags: ['history', 'photography', 'nature'],
        travel: { mode: 'Scooter', mins: 15, cost: 30 },
        why: 'The Dil Chahta Hai fort. 15-min climb, best sunset view in North Goa.',
        alts: [
          { id: 'g-a4x', emoji: '🏝️', title: 'Sunset at Vagator Beach', place: 'Vagator', cost: 0, tags: ['beaches', 'relaxed'], why: 'Zero climbing, feet in the sand.' },
        ] },
      { id: 'g-a5', time: '20:30', emoji: '🍽️', title: 'Dinner at a cliffside Greek taverna', place: 'Vagator cliffs', cost: 0, tags: ['food', 'party'],
        travel: { mode: 'Scooter', mins: 10, cost: 20 },
        why: 'Live music + sea view. Big veg menu, so everyone eats well.',
        alts: [
          { id: 'g-a5x', emoji: '🥥', title: 'Dinner at a South Indian garden café', place: 'Assagao', cost: 0, tags: ['food', 'relaxed'], why: 'Quieter, great veg thalis, early night.' },
        ] },
    ],
  },
  days: [
    {
      id: 'goa-beach', title: 'Beach-hopping & night market', tags: ['beaches', 'relaxed', 'shopping', 'food'],
      items: [
        { id: 'g-b1', time: '09:30', emoji: '🥐', title: 'Breakfast at a French bakery', place: 'Anjuna', cost: 0, tags: ['food'],
          why: 'Croissants, strong coffee, slow start.' },
        { id: 'g-b2', time: '11:00', emoji: '🏖️', title: 'Ashwem & Morjim beaches', place: 'Ashwem', cost: 300, tags: ['beaches', 'relaxed', 'photography'],
          travel: { mode: 'Scooter', mins: 30, cost: 40 },
          why: 'Calmer, cleaner beaches with loungers — ₹300 min. spend at the shack.',
          alts: [
            { id: 'g-b2x', emoji: '🌊', title: 'Mandrem beach & river crossing', place: 'Mandrem', cost: 200, tags: ['beaches', 'nature'], why: 'Even quieter, with a bamboo bridge over the creek.' },
            { id: 'g-b2y', emoji: '🏄', title: 'Beginner surf lesson', place: 'Arambol', cost: 1500, tags: ['adventure', 'beaches'], why: '90-min lesson, boards included.' },
          ] },
        { id: 'g-b3', time: '14:00', emoji: '🥗', title: 'Lunch at a beachside shack', place: 'Morjim', cost: 0, tags: ['food', 'beaches'],
          why: 'Fish thali or veg thali — both under ₹400.' },
        { id: 'g-b4', time: '16:30', emoji: '🥁', title: 'Arambol drum circle at sunset', place: 'Arambol', cost: 0, tags: ['relaxed', 'nightlife', 'photography'],
          travel: { mode: 'Scooter', mins: 20, cost: 30 },
          why: 'Free, chaotic, very Goa.' },
        { id: 'g-b5', time: '19:30', emoji: '🛍️', title: 'Saturday Night Market', place: 'Arpora', cost: 0, tags: ['shopping', 'food', 'nightlife'],
          travel: { mode: 'Scooter', mins: 35, cost: 40 },
          why: 'Street food, live bands and stalls — dinner and shopping in one stop.',
          alts: [
            { id: 'g-b5x', emoji: '🎶', title: 'Live jazz at a garden bar', place: 'Assagao', cost: 600, tags: ['nightlife', 'relaxed'], why: 'Chilled evening, great cocktails.' },
          ] },
      ],
    },
    {
      id: 'goa-heritage', title: 'Old Goa heritage & food trail', tags: ['history', 'culture', 'food', 'photography'],
      items: [
        { id: 'g-h1', time: '09:00', emoji: '⛪', title: 'Basilica of Bom Jesus & Se Cathedral', place: 'Old Goa', cost: 0, tags: ['history', 'culture'],
          travel: { mode: 'Cab (shared)', mins: 45, cost: 250 },
          why: 'UNESCO World Heritage churches — go early, beat the crowds.' },
        { id: 'g-h2', time: '11:30', emoji: '🎨', title: 'Fontainhas Latin Quarter walk', place: 'Panjim', cost: 0, tags: ['history', 'photography', 'culture'],
          travel: { mode: 'Cab (shared)', mins: 20, cost: 100 },
          why: 'Colourful Portuguese houses — the most photogenic hour of the trip.',
          alts: [
            { id: 'g-h2x', emoji: '🧭', title: 'Guided heritage walk with a local', place: 'Panjim', cost: 800, tags: ['history', 'culture'], why: 'Stories behind every house, 2 hours.' },
          ] },
        { id: 'g-h3', time: '13:30', emoji: '🍛', title: 'Goan fish thali (and veg thali)', place: 'Panjim', cost: 0, tags: ['food'],
          why: 'The classic lunch spot locals queue for.' },
        { id: 'g-h4', time: '16:00', emoji: '⛴️', title: 'Free ferry to Divar island + village cycle', place: 'Divar', cost: 150, tags: ['nature', 'culture', 'relaxed'],
          travel: { mode: 'Cab + ferry', mins: 25, cost: 80 },
          why: 'Paddy fields and sleepy chapels — a Goa most tourists miss.' },
        { id: 'g-h5', time: '19:00', emoji: '🚢', title: 'Mandovi river sunset cruise', place: 'Panjim jetty', cost: 500, tags: ['relaxed', 'party'],
          travel: { mode: 'Cab (shared)', mins: 30, cost: 120 },
          why: 'Music, dance and the city lit up — an easy group evening.',
          alts: [
            { id: 'g-h5x', emoji: '🎰', title: 'Floating casino night', place: 'Panjim', cost: 3000, tags: ['nightlife', 'party'], why: 'Entry includes play chips, buffet and drinks.' },
          ] },
      ],
    },
    {
      id: 'goa-water', title: 'Island boat trip & water sports', tags: ['adventure', 'nature', 'beaches', 'packed'],
      items: [
        { id: 'g-w1', time: '08:30', emoji: '🐬', title: 'Grande Island boat trip — snorkel & dolphins', place: 'Sinquerim jetty', cost: 1600, tags: ['adventure', 'nature', 'beaches'],
          travel: { mode: 'Cab (shared)', mins: 40, cost: 200 },
          why: 'Full-day boat with snorkel gear, lunch and dolphin spotting included.',
          alts: [
            { id: 'g-w1x', emoji: '🤿', title: 'Scuba Discover dive', place: 'Grande Island', cost: 4500, tags: ['adventure'], why: 'No certification needed. Bucket list stuff.' },
          ] },
        { id: 'g-w2', time: '15:30', emoji: '🪂', title: 'Parasailing & jet ski', place: 'Baga beach', cost: 1200, tags: ['adventure', 'beaches', 'packed'],
          travel: { mode: 'Cab (shared)', mins: 25, cost: 120 },
          why: 'Combo deal pre-negotiated for groups of 4+.',
          alts: [
            { id: 'g-w2x', emoji: '🛶', title: 'Kayaking in the Sal backwaters', place: 'Nerul', cost: 900, tags: ['nature', 'relaxed'], why: 'Mangroves, kingfishers, golden hour.' },
          ] },
        { id: 'g-w3', time: '18:30', emoji: '🍹', title: 'Sundowners on Baga beach', place: 'Baga', cost: 400, tags: ['relaxed', 'nightlife'],
          why: 'Beanbags, feet in the sand, after a big day.' },
        { id: 'g-w4', time: '21:00', emoji: '🦞', title: 'Seafood dinner at a Baga institution', place: 'Baga', cost: 0, tags: ['food'],
          why: 'Famous for prawn curry — and has a full veg menu.' },
      ],
    },
    {
      id: 'goa-party', title: 'Slow day, big night', tags: ['party', 'nightlife', 'relaxed'],
      items: [
        { id: 'g-p1', time: '11:00', emoji: '🥞', title: 'Late brunch in a garden café', place: 'Assagao', cost: 0, tags: ['food', 'relaxed'],
          why: 'You will thank us for the late start.' },
        { id: 'g-p2', time: '13:30', emoji: '🏊', title: 'Pool, music & naps at the stay', place: 'Your stay', cost: 0, tags: ['relaxed', 'wellness'],
          why: 'Recharge before tonight.',
          alts: [
            { id: 'g-p2x', emoji: '💆', title: 'Ayurvedic massage', place: 'Anjuna', cost: 1800, tags: ['wellness', 'relaxed'], why: '60-min Abhyanga — proper reset.' },
          ] },
        { id: 'g-p3', time: '17:00', emoji: '🌇', title: 'Sunset session at a beach shack', place: 'Anjuna beach', cost: 500, tags: ['nightlife', 'party', 'beaches'],
          travel: { mode: 'Scooter', mins: 10, cost: 20 },
          why: 'The legendary Anjuna shack — DJ from 5 pm.' },
        { id: 'g-p4', time: '22:00', emoji: '🪩', title: 'Club night on Tito’s Lane', place: 'Baga', cost: 1500, tags: ['nightlife', 'party'],
          travel: { mode: 'Cab (shared)', mins: 25, cost: 150 },
          why: 'Cover charge includes drinks. Cab back is pre-booked.',
          alts: [
            { id: 'g-p4x', emoji: '🎸', title: 'Live band at a village pub', place: 'Assagao', cost: 800, tags: ['nightlife', 'relaxed'], why: 'Less crowd, better music, still late.' },
            { id: 'g-p4y', emoji: '🌌', title: 'Hilltop open-air party', place: 'Vagator', cost: 1200, tags: ['party', 'nightlife'], why: 'Psytrance under the stars.' },
          ] },
      ],
    },
    {
      id: 'goa-nature', title: 'Waterfalls & spice farm', tags: ['nature', 'adventure', 'food', 'packed'],
      items: [
        { id: 'g-n1', time: '07:00', emoji: '🚙', title: 'Dudhsagar Falls jeep safari', place: 'Mollem', cost: 1800, tags: ['nature', 'adventure', 'photography'],
          travel: { mode: 'Cab (shared)', mins: 120, cost: 500 },
          why: 'India’s 5th tallest waterfall — jeep through the jungle, swim at the base.',
          alts: [
            { id: 'g-n1x', emoji: '🥾', title: 'Netravali bubbling lake & trek', place: 'Netravali', cost: 600, tags: ['nature', 'adventure'], why: 'Less touristy, gentle 4 km trek.' },
          ] },
        { id: 'g-n2', time: '13:00', emoji: '🌿', title: 'Spice plantation tour + Goan buffet', place: 'Ponda', cost: 500, tags: ['food', 'nature', 'culture'],
          travel: { mode: 'Cab (shared)', mins: 40, cost: 150 },
          why: 'Lunch on banana leaves, includes veg & Jain options.' },
        { id: 'g-n3', time: '17:30', emoji: '🛕', title: 'Mangueshi temple at dusk', place: 'Ponda', cost: 0, tags: ['history', 'culture'],
          why: 'Lamp tower lit up in the evening.' },
        { id: 'g-n4', time: '20:30', emoji: '🍛', title: 'Dinner at a modern Indian bistro', place: 'Assagao', cost: 0, tags: ['food'],
          travel: { mode: 'Cab (shared)', mins: 60, cost: 250 },
          why: 'Kerala-meets-Goa menu, loved by vegetarians.' },
      ],
    },
  ],
  departure: {
    id: 'goa-depart', title: 'Last breakfast, souvenirs, home', tags: ['shopping'],
    items: [
      { id: 'g-d1', time: '09:00', emoji: '🍳', title: 'Breakfast at a classic bakery', place: 'Calangute', cost: 0, tags: ['food'],
        why: 'Their chocolate cake is a Goa ritual.' },
      { id: 'g-d2', time: '10:30', emoji: '🥜', title: 'Cashews & feni at Mapusa market', place: 'Mapusa', cost: 0, tags: ['shopping', 'culture'],
        travel: { mode: 'Scooter', mins: 15, cost: 20 },
        why: 'Half the price of tourist shops.' },
      { id: 'g-d3', time: '12:30', emoji: '🧳', title: 'Return scooters & check out', place: 'Anjuna', cost: 0, tags: [],
        why: 'Buffer time built in — no last-minute panic.' },
      { id: 'g-d4', time: '14:00', emoji: '🛫', title: 'Head home', place: 'Mopa Airport / Thivim station', cost: 0, tags: [],
        travel: { mode: 'Prepaid cab', mins: 50, cost: 450 },
        why: 'Everyone’s return is between 15:30 and 17:00.' },
    ],
  },
}

/* ------------------------------------------------------------------ */
/* MANALI                                                              */
/* ------------------------------------------------------------------ */

const manali: Destination = {
  id: 'manali',
  name: 'Manali',
  region: 'Old Manali base · Himachal Pradesh',
  emoji: '🏔️',
  gradient: 'from-sky-500 via-indigo-500 to-violet-600',
  tagline: 'Snow, pine forests and riverside cafés',
  bestFor: ['nature', 'adventure', 'photography', 'relaxed'],
  foodPerDay: { budget: 700, mid: 1100, premium: 1900 },
  getThere: {
    Delhi: [
      t('man-del-bus', 'bus', 'Volvo overnight from Majnu ka Tilla', '12h overnight', '19:30', 1600, 'Wake up to mountains'),
      t('man-del-fl', 'flight', 'Flight DEL → Kullu (Bhuntar) + cab', '1h 20m + 1h 30m', '06:40', 7500, 'Small plane — limited seats, book soon'),
    ],
    Mumbai: [
      t('man-mum-fl', 'flight', 'Flight BOM → Chandigarh + Volvo', '2h 30m + 8h', '06:00', 7800, 'Volvo leaves Chandigarh 12:00'),
    ],
    Bengaluru: [
      t('man-blr-fl', 'flight', 'Flight BLR → Chandigarh + Volvo', '3h + 8h', '05:50', 8200, 'Volvo leaves Chandigarh 12:00'),
    ],
    Pune: [
      t('man-pnq-fl', 'flight', 'Flight PNQ → Chandigarh + Volvo', '2h 30m + 8h', '06:20', 8000, 'Volvo leaves Chandigarh 12:00'),
    ],
  },
  stays: [
    { id: 'man-stay-hostel', name: 'Pine Nook Hostel — private room', area: 'Old Manali', emoji: '🛏️', kind: 'Hostel · private room', tier: 'budget',
      pricePerNight: 800, rating: 4.4, perks: ['Bonfire nights', 'Café on site', 'Heaters'], why: 'Social, warm and cheap.' },
    { id: 'man-stay-cottage', name: 'Riverside wooden cottage (3BR)', area: 'Old Manali', emoji: '🛖', kind: 'Private cottage', tier: 'mid',
      pricePerNight: 1500, rating: 4.7, perks: ['Beas river view', 'Fireplace', 'Home-cooked Himachali dinner'], why: 'Whole group under one roof with a fireplace.' },
    { id: 'man-stay-resort', name: 'Snowline Mountain Resort', area: 'Prini', emoji: '🏨', kind: 'Luxury resort', tier: 'premium',
      pricePerNight: 4800, rating: 4.8, perks: ['Heated pool', 'Spa', 'Breakfast & dinner'], why: 'Maximum comfort after cold days out.' },
  ],
  arrival: {
    id: 'man-arrive', title: 'Arrive, acclimatise, Mall Road', tags: ['relaxed'],
    items: [
      { id: 'm-a1', time: '09:00', emoji: '👋', title: 'Arrive & check in', place: 'Old Manali', cost: 0, tags: ['relaxed'],
        travel: { mode: 'Cab from bus stand', mins: 15, cost: 100 }, why: 'Rest first — altitude is real.' },
      { id: 'm-a2', time: '13:00', emoji: '☕', title: 'Lunch at a riverside café', place: 'Old Manali', cost: 0, tags: ['food', 'relaxed'], why: 'Trout or rajma-chawal, river view.' },
      { id: 'm-a3', time: '15:30', emoji: '🌲', title: 'Hadimba Temple & cedar forest walk', place: 'Dhungri', cost: 0, tags: ['history', 'nature', 'culture'],
        travel: { mode: 'Walk', mins: 20, cost: 0 }, why: '16th-century wooden temple in a deodar forest.' },
      { id: 'm-a4', time: '19:00', emoji: '🍲', title: 'Dinner & stroll on Mall Road', place: 'Mall Road', cost: 0, tags: ['food', 'shopping'],
        travel: { mode: 'Auto', mins: 10, cost: 60 }, why: 'Momos, siddu and woollens shopping.' },
    ],
  },
  days: [
    { id: 'man-solang', title: 'Solang Valley adventure day', tags: ['adventure', 'packed', 'nature'],
      items: [
        { id: 'm-s1', time: '08:30', emoji: '🪂', title: 'Tandem paragliding', place: 'Solang Valley', cost: 2500, tags: ['adventure'],
          travel: { mode: 'Shared cab', mins: 40, cost: 300 }, why: '15-min flight, GoPro video included.',
          alts: [{ id: 'm-s1x', emoji: '🚡', title: 'Solang ropeway', place: 'Solang Valley', cost: 800, tags: ['nature', 'relaxed'], why: 'Same views, feet on the gondola.' }] },
        { id: 'm-s2', time: '12:00', emoji: '⛷️', title: 'Snow play & ATV ride', place: 'Solang', cost: 1200, tags: ['adventure'], why: 'Snow is usually in by December.' },
        { id: 'm-s3', time: '15:00', emoji: '🥟', title: 'Late lunch — Tibetan thukpa', place: 'Solang', cost: 0, tags: ['food'], why: 'Warm up after the snow.' },
        { id: 'm-s4', time: '19:30', emoji: '🔥', title: 'Bonfire & BBQ at the stay', place: 'Your stay', cost: 400, tags: ['relaxed', 'party'],
          travel: { mode: 'Shared cab', mins: 40, cost: 300 }, why: 'Group time, music, stars.' },
      ] },
    { id: 'man-sissu', title: 'Atal Tunnel & Sissu snow', tags: ['nature', 'photography', 'adventure'],
      items: [
        { id: 'm-t1', time: '07:30', emoji: '🚇', title: 'Drive through Atal Tunnel', place: 'Rohtang', cost: 0, tags: ['nature', 'photography'],
          travel: { mode: 'Private Innova (full day)', mins: 60, cost: 900 }, why: 'World’s longest highway tunnel above 10,000 ft.' },
        { id: 'm-t2', time: '09:30', emoji: '❄️', title: 'Sissu waterfall & frozen lake', place: 'Lahaul', cost: 0, tags: ['nature', 'photography'], why: 'Snow-desert landscapes, unreal photos.' },
        { id: 'm-t3', time: '13:00', emoji: '🍜', title: 'Maggi & chai at a dhaba', place: 'Sissu', cost: 0, tags: ['food'], why: 'Mandatory mountain Maggi.' },
        { id: 'm-t4', time: '18:00', emoji: '♨️', title: 'Vashisht hot springs', place: 'Vashisht', cost: 0, tags: ['wellness', 'relaxed', 'culture'], why: 'Natural sulphur baths — perfect after the cold.' },
      ] },
    { id: 'man-trek', title: 'Jogini Falls trek & Vashisht', tags: ['nature', 'adventure', 'wellness'],
      items: [
        { id: 'm-j1', time: '09:00', emoji: '🥾', title: 'Jogini Falls trek', place: 'Vashisht', cost: 0, tags: ['nature', 'adventure', 'photography'],
          travel: { mode: 'Auto', mins: 15, cost: 80 }, why: 'Easy 2-hr trek through apple orchards to a 150-ft waterfall.',
          alts: [{ id: 'm-j1x', emoji: '🏞️', title: 'Hampta Pass day hike', place: 'Jobra', cost: 1500, tags: ['adventure', 'nature'], why: 'Harder, more dramatic, guide included.' }] },
        { id: 'm-j2', time: '13:30', emoji: '🍎', title: 'Lunch in an apple orchard café', place: 'Vashisht', cost: 0, tags: ['food', 'relaxed'], why: 'Fresh apple pie, mountain view.' },
        { id: 'm-j3', time: '16:00', emoji: '🧘', title: 'Sunset yoga by the Beas', place: 'Old Manali', cost: 500, tags: ['wellness', 'relaxed'], why: 'Gentle stretch after the trek.' },
        { id: 'm-j4', time: '20:00', emoji: '🍷', title: 'Himachali dham dinner', place: 'Your stay', cost: 0, tags: ['food', 'culture'], why: 'Traditional feast, fully vegetarian.' },
      ] },
    { id: 'man-cafe', title: 'Old Manali cafés & live music', tags: ['relaxed', 'nightlife', 'food', 'party'],
      items: [
        { id: 'm-c1', time: '10:30', emoji: '🥞', title: 'Café-hopping breakfast', place: 'Old Manali', cost: 0, tags: ['food', 'relaxed'], why: 'Pancakes, shakshuka and books.' },
        { id: 'm-c2', time: '13:00', emoji: '🛍️', title: 'Tibetan market & woollens', place: 'Mall Road', cost: 0, tags: ['shopping'], why: 'Hand-knit caps and prayer flags.' },
        { id: 'm-c3', time: '17:00', emoji: '🎸', title: 'Live music at a riverside café', place: 'Old Manali', cost: 600, tags: ['nightlife', 'party', 'relaxed'], why: 'Local bands every evening in season.' },
        { id: 'm-c4', time: '21:00', emoji: '🔥', title: 'Late-night bonfire & stories', place: 'Your stay', cost: 300, tags: ['party', 'relaxed'], why: 'The memory everyone talks about later.' },
      ] },
  ],
  departure: {
    id: 'man-depart', title: 'Slow morning, head home', tags: ['relaxed'],
    items: [
      { id: 'm-d1', time: '10:00', emoji: '☕', title: 'Last breakfast with a view', place: 'Old Manali', cost: 0, tags: ['food'], why: 'One more chai.' },
      { id: 'm-d2', time: '12:00', emoji: '🧳', title: 'Check out & souvenir run', place: 'Mall Road', cost: 0, tags: ['shopping'], why: 'Pick up shawls & apple jam.' },
      { id: 'm-d3', time: '17:30', emoji: '🚌', title: 'Head home', place: 'Manali bus stand', cost: 0, tags: [],
        travel: { mode: 'Cab', mins: 15, cost: 100 }, why: 'Overnight return — back home by morning.' },
    ],
  },
}

/* ------------------------------------------------------------------ */
/* JAIPUR                                                              */
/* ------------------------------------------------------------------ */

const jaipur: Destination = {
  id: 'jaipur',
  name: 'Jaipur',
  region: 'Pink City · Rajasthan',
  emoji: '🏰',
  gradient: 'from-pink-500 via-rose-500 to-amber-500',
  tagline: 'Forts, bazaars and royal food',
  bestFor: ['history', 'culture', 'shopping', 'food', 'photography'],
  foodPerDay: { budget: 700, mid: 1100, premium: 2000 },
  getThere: {
    Delhi: [
      t('jai-del-tr', 'train', 'Shatabdi Express · Chair car', '4h 30m', '06:05', 900, 'Breakfast served on board'),
      t('jai-del-bus', 'bus', 'AC Volvo', '5h 30m', '07:00', 750, 'Drops at Sindhi Camp'),
    ],
    Mumbai: [
      t('jai-mum-fl', 'flight', 'Non-stop flight BOM → JAI', '1h 50m', '07:30', 4800, 'Lands 09:20'),
      t('jai-mum-tr', 'train', 'Rajdhani Express · 3AC', '15h overnight', '17:40', 2400, 'Meals included'),
    ],
    Bengaluru: [
      t('jai-blr-fl', 'flight', 'Non-stop flight BLR → JAI', '2h 30m', '06:50', 5600, 'Lands 09:20'),
    ],
    Pune: [
      t('jai-pnq-fl', 'flight', 'Non-stop flight PNQ → JAI', '1h 55m', '08:10', 5200, 'Lands 10:05'),
    ],
  },
  stays: [
    { id: 'jai-stay-hostel', name: 'Old City Haveli Hostel', area: 'Near Hawa Mahal', emoji: '🛏️', kind: 'Heritage hostel', tier: 'budget',
      pricePerNight: 700, rating: 4.5, perks: ['Rooftop with fort view', 'Walk to bazaars'], why: 'Heritage feel at hostel prices.' },
    { id: 'jai-stay-haveli', name: 'Rang Mahal Boutique Haveli', area: 'C-Scheme', emoji: '🏛️', kind: 'Boutique haveli', tier: 'mid',
      pricePerNight: 2000, rating: 4.7, perks: ['Courtyard pool', 'Rooftop dinners', 'Block-printed rooms'], why: 'Feels royal without the palace price.' },
    { id: 'jai-stay-palace', name: 'Raj Niwas Palace Hotel', area: 'Amer Road', emoji: '👑', kind: 'Palace hotel', tier: 'premium',
      pricePerNight: 7200, rating: 4.9, perks: ['Former royal residence', 'Spa', 'Folk dance evenings'], why: 'Once-in-a-lifetime stay.' },
  ],
  arrival: {
    id: 'jai-arrive', title: 'Pink City first look', tags: ['culture'],
    items: [
      { id: 'j-a1', time: '11:00', emoji: '👋', title: 'Arrive & check in', place: 'Jaipur', cost: 0, tags: [],
        travel: { mode: 'Cab', mins: 30, cost: 150 }, why: 'Everyone lands before noon.' },
      { id: 'j-a2', time: '13:00', emoji: '🍛', title: 'Rajasthani thali lunch', place: 'MI Road', cost: 0, tags: ['food', 'culture'], why: 'Dal-baati-churma — unlimited.' },
      { id: 'j-a3', time: '16:00', emoji: '🌸', title: 'Hawa Mahal & chai on a rooftop opposite', place: 'Badi Chaupar', cost: 200, tags: ['history', 'photography'],
        travel: { mode: 'Auto', mins: 15, cost: 60 }, why: 'The iconic façade, best seen from across the road at golden hour.' },
      { id: 'j-a4', time: '18:30', emoji: '💍', title: 'Johari Bazaar evening walk', place: 'Johari Bazaar', cost: 0, tags: ['shopping', 'culture'], why: 'Jewellery, lac bangles, street food.' },
    ],
  },
  days: [
    { id: 'jai-amber', title: 'Amber Fort & stepwells', tags: ['history', 'photography', 'culture'],
      items: [
        { id: 'j-m1', time: '08:00', emoji: '🏰', title: 'Amber Fort', place: 'Amer', cost: 500, tags: ['history', 'culture', 'photography'],
          travel: { mode: 'Cab (shared)', mins: 35, cost: 150 }, why: 'Arrive at opening to beat heat and crowds.',
          alts: [{ id: 'j-m1x', emoji: '🗺️', title: 'Amber Fort with a historian guide', place: 'Amer', cost: 1100, tags: ['history'], why: 'The stories make it 10× better.' }] },
        { id: 'j-m2', time: '11:00', emoji: '🪜', title: 'Panna Meena ka Kund stepwell', place: 'Amer', cost: 0, tags: ['history', 'photography'], why: 'Geometric stepwell — perfect group photo.' },
        { id: 'j-m3', time: '13:00', emoji: '🍽️', title: 'Lunch with a view of Jal Mahal', place: 'Amer Road', cost: 0, tags: ['food'], why: 'Lake palace views.' },
        { id: 'j-m4', time: '17:00', emoji: '🌄', title: 'Nahargarh Fort sunset', place: 'Nahargarh', cost: 200, tags: ['history', 'photography', 'nature'],
          travel: { mode: 'Cab (shared)', mins: 40, cost: 200 }, why: 'The whole city turns pink-gold below you.' },
      ] },
    { id: 'jai-city', title: 'City Palace & bazaars', tags: ['history', 'shopping', 'culture', 'packed'],
      items: [
        { id: 'j-c1', time: '09:30', emoji: '👑', title: 'City Palace', place: 'Old City', cost: 700, tags: ['history', 'culture'], why: 'Royal family still lives in part of it.' },
        { id: 'j-c2', time: '11:30', emoji: '☀️', title: 'Jantar Mantar observatory', place: 'Old City', cost: 200, tags: ['history'], why: 'Giant 18th-century sundial still accurate to 2 seconds.' },
        { id: 'j-c3', time: '13:30', emoji: '🥙', title: 'Pyaaz kachori crawl', place: 'Old City', cost: 0, tags: ['food'], why: 'Three legendary kachori shops in 500 m.' },
        { id: 'j-c4', time: '15:30', emoji: '🛍️', title: 'Bapu Bazaar & block-print shopping', place: 'Bapu Bazaar', cost: 0, tags: ['shopping'], why: 'Mojaris, bedsheets, bargaining practice.',
          alts: [{ id: 'j-c4x', emoji: '🎨', title: 'Block-printing workshop', place: 'Sanganer', cost: 900, tags: ['culture', 'shopping'], why: 'Print your own scarf to take home.' }] },
        { id: 'j-c5', time: '20:00', emoji: '🍸', title: 'Rooftop dinner in a heritage hotel', place: 'C-Scheme', cost: 0, tags: ['food', 'nightlife'], why: 'Live ghazals and lit-up forts.' },
      ] },
    { id: 'jai-village', title: 'Village culture night', tags: ['culture', 'food', 'party', 'relaxed'],
      items: [
        { id: 'j-v1', time: '10:30', emoji: '🐒', title: 'Galta Ji (Monkey Temple)', place: 'Galta', cost: 0, tags: ['history', 'culture', 'nature'],
          travel: { mode: 'Cab (shared)', mins: 25, cost: 120 }, why: 'Temple complex in a mountain pass with natural springs.' },
        { id: 'j-v2', time: '14:00', emoji: '🏊', title: 'Pool afternoon at the stay', place: 'Your stay', cost: 0, tags: ['relaxed'], why: 'Rest before tonight.' },
        { id: 'j-v3', time: '18:30', emoji: '💃', title: 'Rajasthani village experience & dinner', place: 'Tonk Road', cost: 1100, tags: ['culture', 'food', 'party'],
          travel: { mode: 'Cab (shared)', mins: 40, cost: 200 }, why: 'Folk dance, puppet shows, camel cart and a huge veg feast.' },
      ] },
    { id: 'jai-balloon', title: 'Sunrise balloon & lakes', tags: ['adventure', 'photography', 'nature'],
      items: [
        { id: 'j-b1', time: '06:00', emoji: '🎈', title: 'Hot-air balloon at sunrise', place: 'Amer', cost: 9500, tags: ['adventure', 'photography'],
          travel: { mode: 'Cab (shared)', mins: 40, cost: 150 }, why: 'Float over Amber Fort and the Aravallis.',
          alts: [{ id: 'j-b1x', emoji: '🧗', title: 'Ziplining at Neemrana-style fort', place: 'Nahargarh', cost: 1500, tags: ['adventure'], why: 'Cheaper adrenaline fix.' }] },
        { id: 'j-b2', time: '11:00', emoji: '🥛', title: 'Lassi & breakfast at a 1944 lassi shop', place: 'MI Road', cost: 0, tags: ['food'], why: 'Served in kulhads, thick enough to eat with a spoon.' },
        { id: 'j-b3', time: '15:00', emoji: '🪷', title: 'Sisodia Rani garden & Jal Mahal', place: 'Agra Road', cost: 100, tags: ['nature', 'history', 'relaxed'], why: 'Terraced Mughal gardens.' },
      ] },
  ],
  departure: {
    id: 'jai-depart', title: 'Blue pottery & home', tags: ['shopping'],
    items: [
      { id: 'j-d1', time: '09:30', emoji: '🏺', title: 'Blue pottery shopping', place: 'Amer Road', cost: 0, tags: ['shopping', 'culture'], why: 'Jaipur’s signature craft.' },
      { id: 'j-d2', time: '12:00', emoji: '🧳', title: 'Check out & lunch', place: 'Your stay', cost: 0, tags: ['food'], why: 'Buffer for packing those shopping bags.' },
      { id: 'j-d3', time: '14:30', emoji: '🛫', title: 'Head home', place: 'Jaipur airport / station', cost: 0, tags: [],
        travel: { mode: 'Cab', mins: 30, cost: 150 }, why: 'Afternoon departures for everyone.' },
    ],
  },
}

export const DESTINATIONS: Destination[] = [goa, manali, jaipur]
export const getDestination = (id: string) => DESTINATIONS.find((d) => d.id === id) ?? goa
