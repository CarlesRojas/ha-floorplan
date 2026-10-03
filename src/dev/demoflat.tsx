// The demo flat with made up devices, without Home Assistant, for the
// README's screenshots. Served by the dev server, never built into the card:
//
//   http://localhost:5173/src/dev/demoflat.html
//
// Query parameters: `flip=light.bedroom,cover.living_blind` starts those
// entities on, open or unlocked; `camera=x,y,z,tx,ty,tz` overrides the
// opening view; `sun=6` puts the sun at that elevation in degrees, so the
// room can be shot at dusk; `dark` uses Home Assistant's dark theme colors;
// `editor` shows the editor instead of the card; `merge=0` draws every piece
// on its own, to compare against the merged room; `views` gives every room
// a view from above it, so a click on a room flies there; `first=device` has
// a click on a device act on it from anywhere, not go to its room first;
// `mobile=1:1` gives the card that aspect ratio while it is narrow, and 16:9
// otherwise.
// A click on a piece flips its entity, the way Home Assistant would.
import { setMerging } from '#/scene/Merged.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { DEMO_AREAS, DEMO_ENTITIES, DEMO_FLAT, DEMO_STATES, flip } from '../../scripts/demoflat.plan.ts'

await import('#/main.tsx')

const params = new URLSearchParams(location.search)
if (params.get('merge') === '0') setMerging(false)
if (params.has('dark')) {
  const dark: Record<string, string> = {
    '--primary-text-color': '#e1e1e1',
    '--secondary-text-color': '#9b9b9b',
    '--card-background-color': '#1c1c1c',
    '--secondary-background-color': '#202020',
    '--divider-color': 'rgba(225, 225, 225, 0.12)',
  }
  for (const [name, value] of Object.entries(dark)) document.documentElement.style.setProperty(name, value)
  document.body.style.background = '#111111'
}
const states = structuredClone(DEMO_STATES)
for (const id of (params.get('flip') ?? '').split(',')) if (states[id]) flip(states[id])
const sun = Number(params.get('sun'))
if (params.has('sun') && Number.isFinite(sun)) {
  const now = new Date().toISOString()
  states['sun.sun'] = {
    entity_id: 'sun.sun',
    state: sun > 0 ? 'above_horizon' : 'below_horizon',
    attributes: { elevation: sun },
    last_changed: now,
    last_updated: now,
  }
}

const config: CardConfig = { ...DEMO_FLAT, aspect_ratio: `${innerWidth} / ${innerHeight}` }
const camera = params.get('camera')?.split(',').map(Number)
if (camera?.length === 6) {
  config.camera = { position: [camera[0], camera[1], camera[2]], target: [camera[3], camera[4], camera[5]] }
}
if (params.has('views')) {
  config.rooms = config.rooms?.map(room => {
    const x = room.points.reduce((sum, p) => sum + p[0], 0) / room.points.length
    const y = room.points.reduce((sum, p) => sum + p[1], 0) / room.points.length
    return { ...room, camera: { position: [x + 2, 7, -y + 5], target: [x, 0, -y] } }
  })
}
const mobile = params.get('mobile')
if (mobile) {
  config.aspect_ratio = '16:9'
  config.aspect_ratio_mobile = mobile
}
if (params.get('first') === 'device') config.first_click = 'device'

type CardElement = HTMLElement & { setConfig: (c: CardConfig) => void; hass: HomeAssistant }
const element = document.createElement(params.has('editor') ? 'floorplan-3d-editor' : 'floorplan-3d') as CardElement
const hass = (): HomeAssistant => ({
  states: structuredClone(states),
  areas: DEMO_AREAS,
  entities: DEMO_ENTITIES,
  callService: (_domain, _service, data) => {
    const id = data?.entity_id
    if (typeof id === 'string' && states[id]) {
      flip(states[id])
      element.hass = hass()
    }
    return Promise.resolve()
  },
  themes: { darkMode: false },
})
element.style.cssText = 'display:block;width:100vw;height:100vh'
element.setConfig(config)
element.hass = hass()
document.body.appendChild(element)
