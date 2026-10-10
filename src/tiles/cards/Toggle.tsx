import { callService, type TileEnv } from '#/tiles/actions.ts'
import { BrightnessTile } from '#/tiles/cards/Brightness.tsx'
import { dims } from '#/tiles/features/light.tsx'
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
// across the whole tile.
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
  if (domain === 'light' && config.feature === 'brightness' && !unavailable && dims(entity)) {
    const { feature: _, ...plain } = config
    return <BrightnessTile env={env} config={plain} entity={entity} accent={accent} glow={glow!} />
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
      onTap={() => callService(env.hass, `${domain}.toggle`, { entity_id: config.entity })}
      glow={glow}
    />
  )
}
