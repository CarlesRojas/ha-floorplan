// The Floorplan tiles on a mock dashboard, with a mock Home Assistant
// that answers every action, for working on them without a real one.
// Served by the dev server, never built into the card:
//
//   http://localhost:5173/src/dev/tiles.html
//
// The buttons on top set the room filter the floorplan card would, and
// light=1 shows the light dashboard.
import { setRoomFilter } from '#/lib/roomFilter.ts'
import { registerTiles } from '#/tiles/index.tsx'
import type { EntityState, HomeAssistant } from '#/types.ts'

registerTiles()

const light = new URLSearchParams(location.search).get('light') === '1'
const now = new Date().toISOString()
const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}): EntityState => ({
  entity_id,
  state: value,
  attributes,
  last_changed: now,
  last_updated: now,
})

const states: Record<string, EntityState> = {}
for (const s of [
  state('switch.living_light', 'on', { friendly_name: 'Living Room Light' }),
  state('light.office_lamp', 'on', { friendly_name: 'Office Lamp', brightness: 140 }),
  state('switch.kitchen_light', 'off', { friendly_name: 'Kitchen Light' }),
  state('input_boolean.projector_mode', 'off', { friendly_name: 'Projector Mode' }),
  state('switch.broken', 'unavailable', { friendly_name: 'Broken Plug' }),
  state('button.scoop', new Date(Date.now() - 3 * 3600_000).toISOString(), { friendly_name: 'Scoop' }),
  state('button.never', 'unknown', { friendly_name: 'Never pressed' }),
  state('scene.movie', now, { friendly_name: 'Movie' }),
  state('cover.living_blind', 'closed', {
    friendly_name: 'Living Room Blind',
    supported_features: 11,
    assumed_state: true,
  }),
  state('cover.projector', 'open', { friendly_name: 'Projector Screen', supported_features: 11, assumed_state: true }),
  state('cover.bedroom', 'open', { friendly_name: 'Bedroom Blind', supported_features: 15, current_position: 40 }),
  state('vacuum.robot', 'docked', { friendly_name: 'Robot', supported_features: 8192 | 4 | 8 | 16 }),
  state('sensor.robot_battery', '87', {}),
  state('select.clean_mode', 'Max Vacuum', {
    friendly_name: 'Clean Mode',
    options: ['Quiet', 'Standard', 'Max Vacuum', 'Mop', 'Vacuum and Mop'],
  }),
  state('climate.living', 'heat', {
    friendly_name: 'Thermostat',
    hvac_action: 'heating',
    current_temperature: 20.5,
    temperature: 22,
    min_temp: 7,
    max_temp: 35,
    hvac_modes: ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'],
    fan_mode: 'auto_low',
    fan_modes: ['on_low', 'on_high', 'auto_low', 'auto_high', 'off'],
    swing_mode: 'off',
    swing_modes: ['auto', '1', '2', '3', 'off'],
  }),
  state('climate.range', 'heat_cool', {
    friendly_name: 'Air Conditioner',
    hvac_action: 'idle',
    current_temperature: 23,
    target_temp_low: 19,
    target_temp_high: 24,
    min_temp: 7,
    max_temp: 35,
    hvac_modes: ['off', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'],
    preset_mode: 'home',
    preset_modes: ['home', 'eco', 'away'],
  }),
  state('water_heater.tank', 'eco', {
    friendly_name: 'Water Heater',
    current_temperature: 48,
    temperature: 50,
    min_temp: 35,
    max_temp: 65,
    operation_mode: 'eco',
    operation_list: ['eco', 'electric', 'performance', 'off'],
  }),
  state('media_player.living', 'playing', {
    friendly_name: 'Speaker',
    media_title: 'Night Drive',
    media_artist: 'Some Band',
    supported_features: 1 | 16 | 32 | 16384,
  }),
  state('lock.front', 'locked', { friendly_name: 'Front Door' }),
  state('sensor.living_temperature', '21.4', {
    friendly_name: 'Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  state('binary_sensor.living_motion', 'on', { friendly_name: 'Motion', device_class: 'motion' }),
])
  states[s.entity_id] = s

const area = (area_id: string, name: string) => ({ area_id, name, floor_id: null, icon: null })
const entities = Object.fromEntries(
  Object.keys(states).map(id => [
    id,
    {
      entity_id: id,
      area_id: id.includes('office')
        ? 'office'
        : id.includes('kitchen')
          ? 'kitchen'
          : id.includes('projector_mode')
            ? null
            : 'living_room',
    },
  ]),
)

let hass: HomeAssistant
const tiles: HTMLElement[] = []
function update(id: string, value: string, attributes?: Record<string, unknown>) {
  const old = states[id]
  states[id] = {
    ...old,
    state: value,
    attributes: { ...old.attributes, ...attributes },
    last_changed: new Date().toISOString(),
  }
  hass = { ...hass, states: { ...states } }
  for (const t of tiles) (t as unknown as { hass: HomeAssistant }).hass = hass
}

hass = {
  states,
  areas: {
    living_room: area('living_room', 'Living Room'),
    kitchen: area('kitchen', 'Kitchen'),
    office: area('office', 'Office'),
  },
  entities,
  devices: {},
  themes: { darkMode: !light },
  locale: { language: 'en' },
  callService: async (domain, service, data) => {
    console.info('callService', domain, service, data)
    const id = data?.entity_id as string
    const s = states[id]
    if (!s) return
    if (service === 'toggle' && domain !== 'cover') update(id, s.state === 'on' ? 'off' : 'on')
    if (service === 'press' || (domain === 'scene' && service === 'turn_on')) update(id, new Date().toISOString())
    if (domain === 'cover') {
      const open = service === 'open_cover' || (service === 'toggle' && s.state !== 'open')
      if (service !== 'stop_cover') update(id, open ? 'open' : 'closed')
    }
    if (domain === 'vacuum')
      update(id, { start: 'cleaning', pause: 'paused', stop: 'idle', return_to_base: 'returning' }[service] ?? s.state)
    if (service === 'select_option') update(id, data!.option as string)
    if (domain === 'lock') update(id, service === 'lock' ? 'locked' : 'unlocked')
    if (service === 'set_temperature') {
      const { entity_id: _, ...aim } = data!
      update(id, s.state, aim)
    }
    if (service === 'set_hvac_mode') update(id, data!.hvac_mode as string)
    if (service === 'set_operation_mode')
      update(id, data!.operation_mode as string, { operation_mode: data!.operation_mode })
    for (const key of ['fan_mode', 'preset_mode', 'swing_mode'])
      if (service === `set_${key}`) update(id, s.state, { [key]: data![key] })
    if (domain === 'media_player' && service === 'media_play_pause')
      update(id, s.state === 'playing' ? 'paused' : 'playing')
  },
}

const sections: { title: Record<string, unknown>; cards: Record<string, unknown>[] }[] = [
  {
    title: { type: 'fp-title', title: 'Living Room', area: 'living_room' },
    cards: [
      { type: 'fp-toggle', entity: 'switch.living_light', icon: 'ph:lamp-pendant' },
      { type: 'fp-toggle', entity: 'switch.broken' },
      { type: 'fp-cover', entity: 'cover.living_blind', size: 'wide' },
      { type: 'fp-cover', entity: 'cover.projector', size: 'wide', invert: true, icon: 'ph:projector-screen' },
      { type: 'fp-cover', entity: 'cover.bedroom' },
      { type: 'fp-vacuum', entity: 'vacuum.robot', size: 'wide', battery_entity: 'sensor.robot_battery' },
      { type: 'fp-select', entity: 'select.clean_mode', icon: 'ph:sliders' },
      { type: 'fp-select', entity: 'select.clean_mode', tap_behavior: 'cycle', name: 'Cycle mode' },
      { type: 'fp-button', entity: 'button.scoop', icon: 'ph:cat' },
      { type: 'fp-button', entity: 'button.never' },
      { type: 'fp-button', entity: 'scene.movie', icon: 'ph:popcorn' },
      { type: 'fp-climate', entity: 'climate.living', size: 'wide' },
      { type: 'fp-climate', entity: 'climate.range', size: 'wide' },
      { type: 'fp-climate', entity: 'water_heater.tank', size: 'wide' },
      { type: 'fp-climate', entity: 'climate.living' },
      { type: 'fp-media', entity: 'media_player.living', size: 'wide' },
      { type: 'fp-lock', entity: 'lock.front' },
      { type: 'fp-entity', entity: 'sensor.living_temperature' },
      { type: 'fp-entity', entity: 'binary_sensor.living_motion' },
    ],
  },
  {
    title: { type: 'fp-title', area: 'kitchen' },
    cards: [{ type: 'fp-toggle', entity: 'switch.kitchen_light', icon: 'mdi:ceiling-light' }],
  },
  {
    title: { type: 'fp-title', title: 'Office', area: 'office' },
    cards: [{ type: 'fp-toggle', entity: 'light.office_lamp', icon: 'ph:lamp' }],
  },
  {
    title: { type: 'fp-title', title: 'Everywhere', room_filter: 'show' },
    cards: [{ type: 'fp-toggle', entity: 'input_boolean.projector_mode', room_filter: 'show', icon: 'ph:film-strip' }],
  },
]

document.body.style.cssText = `margin:0;min-height:100vh;font-family:system-ui;background:${
  light ? 'linear-gradient(160deg,#e9e4dc,#cfd8e3)' : 'linear-gradient(160deg,#2b2f3a,#151821 60%,#0e0f14)'
};color:${light ? '#1c1c1e' : '#fff'};--primary-text-color:${light ? '#1c1c1e' : '#fff'}`

const bar = document.createElement('div')
bar.style.cssText = 'display:flex;gap:8px;padding:16px;flex-wrap:wrap'
for (const [label, area] of [
  ['All', null],
  ['Living Room', 'living_room'],
  ['Kitchen', 'kitchen'],
  ['Office', 'office'],
] as const) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = () => setRoomFilter(area ? { area_id: area, room_id: area } : null)
  bar.appendChild(b)
}
document.body.appendChild(bar)

const grid = document.createElement('div')
grid.style.cssText =
  'display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:24px;padding:0 16px 32px;align-items:start'
document.body.appendChild(grid)

type Card = HTMLElement & {
  setConfig(c: unknown): void
  hass: HomeAssistant
  getGridOptions(): { columns?: number | string; rows?: number | string }
}

// Stands in for Home Assistant's grid section: twelve columns, 56 px rows,
// a card hidden when it says so, and the section hidden with all its cards.
for (const section of sections) {
  const el = document.createElement('div')
  el.style.cssText = 'display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:56px;gap:8px'
  const cells: HTMLElement[] = []
  for (const config of [section.title, ...section.cards]) {
    const card = document.createElement(config.type as string) as Card
    card.setConfig(config)
    card.hass = hass
    tiles.push(card)
    const cell = document.createElement('div')
    const { columns = 6, rows = 2 } = card.getGridOptions()
    cell.style.gridColumn = `span ${columns === 'full' ? 12 : columns}`
    if (rows !== 'auto') cell.style.gridRow = `span ${rows}`
    cell.appendChild(card)
    const sync = () => {
      cell.style.display = card.hidden ? 'none' : ''
      el.style.display = cells.every(c => c.style.display === 'none') ? 'none' : 'grid'
    }
    card.addEventListener('card-visibility-changed', sync)
    cells.push(cell)
    el.appendChild(cell)
    sync()
  }
  grid.appendChild(el)
}

window.addEventListener('hass-more-info', e => console.info('more-info', (e as CustomEvent).detail))
