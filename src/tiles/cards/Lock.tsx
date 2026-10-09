import { callService, formatState, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A lock. A tap locks it, or unlocks it while it is locked. It is lit
// while it is not locked, since that is the state worth seeing from afar.
export default function Lock({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const locked = entity?.state === 'locked' || entity?.state === 'locking'
  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={!!entity && !locked}
      toggles
      accent="var(--_accent-light)"
      state={formatState(env.hass, entity)}
      onTap={() => callService(env.hass, locked ? 'lock.unlock' : 'lock.lock', { entity_id: config.entity })}
    />
  )
}
