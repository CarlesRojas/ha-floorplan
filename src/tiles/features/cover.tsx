import { callService } from '#/tiles/actions.ts'
import { Control } from '#/tiles/Control.tsx'
import {
  domainOf,
  Group,
  listOf,
  MenuPill,
  numberOf,
  optionWord,
  Pill,
  supports,
  TogglePill,
  type FeatureProps,
} from '#/tiles/features/parts.tsx'

// The features of a cover, a valve and a fan.

// The bits of supported_features they share: covers and valves open, close,
// go to a position and stop with the same four.
export const OPEN = 1
export const CLOSE = 2
export const SET_POSITION = 4
export const STOP = 8
export const OPEN_TILT = 16
export const CLOSE_TILT = 32
export const STOP_TILT = 64
export const SET_TILT = 128

const FAN_SPEED = 1
const FAN_OSCILLATE = 2
const FAN_DIRECTION = 4
const FAN_PRESET = 8
export const FAN = { speed: FAN_SPEED, oscillate: FAN_OSCILLATE, direction: FAN_DIRECTION, preset: FAN_PRESET }

const percent = (v: number) => `${v}%`

// The services of a cover and of a valve, which only differ in their last
// word.
const service = (domain: string, verb: string) => (domain === 'valve' ? `valve.${verb}_valve` : `cover.${verb}_cover`)

// Up, stop and down. Stop only for a cover that can stop, so one that
// only opens and closes shows just the two arrows. Inverted, for a screen
// that comes down to open, up closes and down opens.
export function OpenClose({ env, config, entity }: FeatureProps) {
  const domain = domainOf(entity)
  const invert = (config as { invert?: boolean }).invert === true
  const run = (verb: string) => () => callService(env.hass, service(domain, verb), { entity_id: entity.entity_id })
  return (
    <Group label={domain === 'valve' ? 'Valve' : 'Cover'}>
      <Control icon="ph:caret-up" label={invert ? 'Close' : 'Open'} onPress={run(invert ? 'close' : 'open')} />
      {supports(entity, STOP) && <Control icon="ph:stop" label="Stop" onPress={run('stop')} />}
      <Control icon="ph:caret-down" label={invert ? 'Open' : 'Close'} onPress={run(invert ? 'open' : 'close')} />
    </Group>
  )
}

// Opens and closes the slats, and stops them where it can.
export function Tilt({ env, entity }: FeatureProps) {
  const run = (verb: string) => () => callService(env.hass, `cover.${verb}`, { entity_id: entity.entity_id })
  return (
    <Group label="Tilt">
      <Control icon="ph:arrow-line-up" label="Open the slats" onPress={run('open_cover_tilt')} />
      {supports(entity, STOP_TILT) && <Control icon="ph:stop" label="Stop" onPress={run('stop_cover_tilt')} />}
      <Control icon="ph:arrow-line-down" label="Close the slats" onPress={run('close_cover_tilt')} />
    </Group>
  )
}

const FAVORITES = [0, 25, 50, 75, 100]

// A few positions a press away, the one it is at picked out.
export function Favorites({ env, config, entity, tilt }: FeatureProps & { tilt?: boolean }) {
  const domain = domainOf(entity)
  const now = numberOf(entity, tilt ? 'current_tilt_position' : 'current_position')
  const favorites = (config.favorites?.length ? config.favorites : FAVORITES).slice(0, 6)
  const go = (position: number) => () =>
    tilt
      ? callService(env.hass, 'cover.set_cover_tilt_position', { entity_id: entity.entity_id, tilt_position: position })
      : callService(env.hass, domain === 'valve' ? 'valve.set_valve_position' : 'cover.set_cover_position', {
          entity_id: entity.entity_id,
          position,
        })
  return (
    <div className="fp-group" role="radiogroup" aria-label={tilt ? 'Favorite tilts' : 'Favorite positions'}>
      {favorites.map(position => (
        <Pill
          key={position}
          label={percent(position)}
          checked={now === position}
          onPress={go(position)}
          ariaLabel={`${tilt ? 'Tilt' : 'Position'} ${position}%`}
        />
      ))}
    </div>
  )
}

export function FanPreset({ env, entity }: FeatureProps) {
  const preset = typeof entity.attributes.preset_mode === 'string' ? entity.attributes.preset_mode : null
  return (
    <MenuPill
      icon="ph:sliders-horizontal"
      label="Preset"
      options={listOf(entity, 'preset_modes')}
      current={preset}
      word={option => optionWord(env.hass, entity, option, 'preset_mode')}
      onPick={option =>
        callService(env.hass, 'fan.set_preset_mode', { entity_id: entity.entity_id, preset_mode: option })
      }
    />
  )
}

// Which way it turns, forward or in reverse.
export function FanDirection({ env, entity }: FeatureProps) {
  const set = (direction: string) => () =>
    entity.attributes.direction !== direction &&
    callService(env.hass, 'fan.set_direction', { entity_id: entity.entity_id, direction })
  return (
    <Group label="Direction" radio>
      <Control
        icon="ph:arrow-clockwise"
        label="Forward"
        role="radio"
        checked={entity.attributes.direction === 'forward'}
        className="fp-mode"
        onPress={set('forward')}
      />
      <Control
        icon="ph:arrow-counter-clockwise"
        label="Reverse"
        role="radio"
        checked={entity.attributes.direction === 'reverse'}
        className="fp-mode"
        onPress={set('reverse')}
      />
    </Group>
  )
}

export function FanOscillate({ env, entity }: FeatureProps) {
  // A fan that is off shows no oscillation, even when it will once it is on.
  const oscillating = entity.attributes.oscillating === true
  return (
    <TogglePill
      icon="ph:arrows-left-right"
      label="Oscillate"
      on={entity.state === 'on' && oscillating}
      onToggle={() =>
        callService(env.hass, 'fan.oscillate', { entity_id: entity.entity_id, oscillating: !oscillating })
      }
    />
  )
}
