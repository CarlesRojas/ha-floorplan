// The demo flat with made up devices, without Home Assistant, for the
// README's screenshots. Served by the dev server, never built into the card:
//
//   http://localhost:5173/src/dev/demoflat.html
//
// Query parameters: `flip=light.bedroom,cover.living_blind` starts those
// entities on, open or unlocked; `camera=x,y,z,tx,ty,tz` overrides the
// opening view; `editor` shows the editor instead of the card. A click on a
// piece flips its entity, the way Home Assistant would.
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { DEMO_AREAS, DEMO_ENTITIES, DEMO_FLAT, DEMO_STATES, flip } from '../../scripts/demoflat.plan.ts'

await import('#/main.tsx')

const params = new URLSearchParams(location.search)
const states = structuredClone(DEMO_STATES)
for (const id of (params.get('flip') ?? '').split(',')) if (states[id]) flip(states[id])

const config: CardConfig = { ...DEMO_FLAT, aspect_ratio: `${innerWidth} / ${innerHeight}` }
const camera = params.get('camera')?.split(',').map(Number)
if (camera?.length === 6) {
  config.camera = { position: [camera[0], camera[1], camera[2]], target: [camera[3], camera[4], camera[5]] }
}

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
