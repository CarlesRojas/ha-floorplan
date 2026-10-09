import { callService, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A light, a switch, a boolean helper, or anything else that is either on
// or off, like a humidifier, a siren or an automation. A tap turns it on or
// off. A light that is on and dims says how bright it is. Switches take the
// light's color, since most of them drive a light. A valve is open or
// closed instead, and takes the cover's color.
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
  const accent = valve
    ? 'var(--_accent-cover)'
    : domain === 'input_boolean' || domain === 'automation'
      ? 'var(--_accent)'
      : 'var(--_accent-light)'
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
    />
  )
}
