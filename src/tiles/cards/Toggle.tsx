import { callService, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A light, a switch or a boolean helper. A tap turns it on or off. A light
// that is on and dims says how bright it is. Switches take the light's
// color, since most of them drive a light.
export default function Toggle({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const on = entity?.state === 'on'
  const domain = config.entity!.split('.')[0]
  const brightness = entity?.attributes.brightness
  const state = !on
    ? 'Off'
    : typeof brightness === 'number'
      ? `${Math.max(1, Math.round((brightness / 255) * 100))}%`
      : 'On'
  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={on}
      role="switch"
      accent={domain === 'input_boolean' ? 'var(--_accent)' : 'var(--_accent-light)'}
      state={state}
      onTap={() => callService(env.hass, `${domain}.toggle`, { entity_id: config.entity })}
    />
  )
}
