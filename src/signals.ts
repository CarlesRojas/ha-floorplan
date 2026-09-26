import type { HomeAssistant } from '#/types.ts'

// Abstract controls a device exposes, derived from its Home Assistant domain
// and attributes. Decoration models express state through these instead of
// knowing about domains.
export type Signal = 'toggle' | 'level' | 'color' | 'warmth' | 'value' | 'enum'

// A device can offer more than one percentage: a cover has its position and
// often a tilt, a light its brightness. One of them drives what an item
// does, and an item with two of its own, a window that opens and tilts, can
// take a different one for each.
export type LevelChannel = { id: string; label: string }

export function levelChannels(hass: HomeAssistant, entityId: string): LevelChannel[] {
  const attrs = hass.states[entityId]?.attributes ?? {}
  const out: LevelChannel[] = []
  switch (domainOf(entityId)) {
    case 'cover':
      if (typeof attrs.current_position === 'number') out.push({ id: 'position', label: 'Position' })
      if (typeof attrs.current_tilt_position === 'number') out.push({ id: 'tilt', label: 'Tilt' })
      break
    case 'light':
      if (typeof attrs.brightness === 'number') out.push({ id: 'brightness', label: 'Brightness' })
      break
    case 'fan':
      if (typeof attrs.percentage === 'number') out.push({ id: 'percentage', label: 'Speed' })
      break
    case 'media_player':
      if (typeof attrs.volume_level === 'number') out.push({ id: 'volume', label: 'Volume' })
      break
  }
  return out
}

// Every percentage the device reports, by channel id, 0 to 1.
export function levelValues(hass: HomeAssistant, entityId: string): Record<string, number> {
  const attrs = hass.states[entityId]?.attributes ?? {}
  const out: Record<string, number> = {}
  const put = (id: string, value: unknown, scale: number) => {
    if (typeof value === 'number') out[id] = Math.min(Math.max(value / scale, 0), 1)
  }
  put('position', attrs.current_position, 100)
  put('tilt', attrs.current_tilt_position, 100)
  put('brightness', attrs.brightness, 255)
  put('percentage', attrs.percentage, 100)
  put('volume', attrs.volume_level, 1)
  return out
}

export type SignalValues = {
  on?: boolean
  // 0 to 1
  level?: number
  // [r, g, b] 0 to 255
  color?: [number, number, number]
  // Kelvin
  warmth?: number
  value?: number
  state?: string
}

const domainOf = (entityId: string) => entityId.split('.')[0]

const COLOR_MODES_WITH_COLOR = new Set(['hs', 'rgb', 'rgbw', 'rgbww', 'xy'])
const COLOR_MODES_WITH_LEVEL = new Set(['brightness', 'color_temp', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'white'])

export function deviceSignals(hass: HomeAssistant, entityId: string): Signal[] {
  const attrs = hass.states[entityId]?.attributes ?? {}
  switch (domainOf(entityId)) {
    case 'light': {
      const modes = (attrs.supported_color_modes as string[] | undefined) ?? []
      const out: Signal[] = ['toggle']
      if (modes.some(m => COLOR_MODES_WITH_LEVEL.has(m))) out.push('level')
      if (modes.some(m => COLOR_MODES_WITH_COLOR.has(m))) out.push('color')
      if (modes.includes('color_temp')) out.push('warmth')
      return out
    }
    case 'switch':
    case 'input_boolean':
    case 'humidifier':
    case 'lock':
    case 'binary_sensor':
      return ['toggle']
    case 'cover':
      return typeof attrs.current_position === 'number' ? ['toggle', 'level'] : ['toggle']
    case 'fan':
      return typeof attrs.percentage === 'number' ? ['toggle', 'level'] : ['toggle']
    case 'media_player':
      return typeof attrs.volume_level === 'number' ? ['toggle', 'level'] : ['toggle']
    case 'vacuum':
      // A vacuum is started and sent home, which is a switch as far as the
      // models are concerned: running or not.
      return ['toggle']
    // A climate device runs or not, and says in words what it runs as.
    case 'climate':
      return ['toggle', 'enum']
    case 'select':
    case 'input_select':
      return ['enum']
    case 'sensor':
    case 'number':
    case 'input_number':
      return ['value']
    default:
      return []
  }
}

export function signalValues(hass: HomeAssistant, entityId: string): SignalValues {
  const entity = hass.states[entityId]
  if (!entity) return {}
  const attrs = entity.attributes
  const state = entity.state
  switch (domainOf(entityId)) {
    case 'light': {
      const out: SignalValues = { on: state === 'on', state }
      if (typeof attrs.brightness === 'number') out.level = Math.min(Math.max(attrs.brightness / 255, 0), 1)
      const rgb = attrs.rgb_color
      if (Array.isArray(rgb) && rgb.length >= 3) out.color = [rgb[0], rgb[1], rgb[2]] as [number, number, number]
      if (typeof attrs.color_temp_kelvin === 'number') out.warmth = attrs.color_temp_kelvin
      return out
    }
    case 'cover':
      return {
        on: state === 'open' || state === 'opening',
        level: typeof attrs.current_position === 'number' ? attrs.current_position / 100 : undefined,
        state,
      }
    case 'fan':
      return {
        on: state === 'on',
        level: typeof attrs.percentage === 'number' ? attrs.percentage / 100 : undefined,
        state,
      }
    case 'media_player':
      return {
        on: state !== 'off' && state !== 'unavailable' && state !== 'standby',
        level: typeof attrs.volume_level === 'number' ? attrs.volume_level : undefined,
        state,
      }
    case 'lock':
      return { on: state === 'locked', state }
    // Home Assistant has a word for each part of a vacuum's round. Only one
    // of them means it is out on the floor.
    case 'vacuum':
      return { on: state === 'cleaning', state }
    // Its mode is the setting, heat or cool. What it is doing right now,
    // heating or cooling, says more when the device reports it.
    case 'climate': {
      const action = attrs.hvac_action
      const doing = action === 'heating' || action === 'cooling' ? action : undefined
      return { on: !['off', 'unavailable', 'unknown'].includes(state), state: doing ?? state }
    }
    case 'sensor':
    case 'number':
    case 'input_number': {
      // A sensor that is unavailable or unknown has no number to show.
      const value = Number(state)
      return { value: Number.isFinite(value) ? value : undefined, state }
    }
    default:
      return { on: state === 'on', state }
  }
}

// The service call a click on a device performs. Null when there is none.
// Most domains toggle, which needs nothing but the entity. A vacuum has no
// toggle to call, so it is sent out or sent home by what it is doing now.
export function clickAction(entityId: string, state?: string): { domain: string; service: string } | null {
  const domain = domainOf(entityId)
  switch (domain) {
    case 'light':
    case 'switch':
    case 'input_boolean':
    case 'fan':
    case 'cover':
    case 'media_player':
    case 'humidifier':
      return { domain, service: 'toggle' }
    case 'vacuum':
      return { domain, service: state === 'cleaning' ? 'return_to_base' : 'start' }
    // A lock is locked or unlocked by what it is now, so a click on an
    // unlocked door locks it rather than asking it to unlock again.
    case 'lock':
      return { domain, service: state === 'unlocked' || state === 'open' ? 'lock' : 'unlock' }
    case 'button':
    case 'input_button':
      return { domain, service: 'press' }
    case 'scene':
      return { domain, service: 'turn_on' }
    case 'script':
      return { domain, service: 'turn_on' }
    default:
      return null
  }
}

// Approximate RGB of a black body at the given temperature, 0 to 1 each.
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.min(Math.max(kelvin, 1000), 12000) / 100
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332)
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305
  const clamp = (v: number) => Math.min(Math.max(v, 0), 255) / 255
  return [clamp(r), clamp(g), clamp(b)]
}
