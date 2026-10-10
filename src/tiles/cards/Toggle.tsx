import { callService, type TileEnv } from '#/tiles/actions.ts'
import { FillTile, PositionTile } from '#/tiles/cards/Fill.tsx'
import { FAN, SET_POSITION } from '#/tiles/features/cover.tsx'
import { dims } from '#/tiles/features/light.tsx'
import { numberOf, supports } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A light, a switch, a boolean helper, or anything else that is either on
// or off, like a humidifier, a siren or an automation. A tap turns it on or
// off. A light that is on and dims says how bright it is. Switches take the
// light's color, since most of them drive a light. A valve is open or
// closed instead, and takes the cover's color. A light that is on washes
// its tile from the top left corner with the color it shines in, read from
// its hue and saturation at full brightness, and its icon takes that color
// too. A light that dims, with the brightness feature, is its brightness
// across the whole tile, a fan with the speed feature its speed, and a
// valve with the position feature how far it is open.
export default function Toggle({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const domain = config.entity!.split('.')[0]
  const valve = domain === 'valve'
  const on = valve ? entity?.state === 'open' || entity?.state === 'opening' : entity?.state === 'on'
  const brightness = entity?.attributes.brightness
  const state = valve
    ? on
      ? 'Open'
      : 'Closed'
    : !on
      ? 'Off'
      : typeof brightness === 'number'
        ? `${Math.max(1, Math.round((brightness / 255) * 100))}%`
        : 'On'
  const hs = entity?.attributes.hs_color
  const colored = domain === 'light' && Array.isArray(hs)
  const glow = colored
    ? `hsl(${hs[0]} 100% ${100 - hs[1] / 2}%)`
    : domain === 'light'
      ? 'var(--_accent-light)'
      : undefined
  // The icon a little deeper than the light, so a pale color still shows on
  // the light tile.
  const accent = colored
    ? `hsl(${hs[0]} 100% ${Math.min(58, 100 - hs[1] / 2)}%)`
    : valve
      ? 'var(--_accent-cover)'
      : domain === 'input_boolean' || domain === 'automation'
        ? 'var(--_accent)'
        : 'var(--_accent-light)'
  const unavailable = !entity || entity.state === 'unavailable' || entity.state === 'unknown'
  const toggle = () => callService(env.hass, `${domain}.toggle`, { entity_id: config.entity })
  const { feature: _, ...plain } = config
  if (domain === 'light' && config.feature === 'brightness' && !unavailable && dims(entity)) {
    return (
      <FillTile
        env={env}
        config={plain}
        entity={entity}
        value={on ? Math.max(1, Math.round(((typeof brightness === 'number' ? brightness : 255) / 255) * 100)) : 0}
        accent={accent}
        glow={glow}
        onTap={toggle}
        onSend={v =>
          v === 0
            ? callService(env.hass, 'light.turn_off', { entity_id: entity.entity_id })
            : callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, brightness_pct: v })
        }
      />
    )
  }
  if (valve && config.feature === 'position' && !unavailable && supports(entity, SET_POSITION))
    return <PositionTile env={env} config={plain} entity={entity} />
  if (domain === 'fan' && config.feature === 'speed' && !unavailable && supports(entity, FAN.speed)) {
    return (
      <FillTile
        env={env}
        config={plain}
        entity={entity}
        value={on ? (numberOf(entity, 'percentage') ?? 100) : 0}
        step={numberOf(entity, 'percentage_step') ?? 1}
        accent={accent}
        onTap={toggle}
        onSend={v => callService(env.hass, 'fan.set_percentage', { entity_id: entity.entity_id, percentage: v })}
      />
    )
  }
  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={on}
      role="switch"
      accent={accent}
      state={state}
      onTap={toggle}
      glow={glow}
    />
  )
}
