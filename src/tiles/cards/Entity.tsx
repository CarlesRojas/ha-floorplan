import { formatState, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'
import type { EntityState } from '#/types.ts'

type Props = { env: TileEnv; config: TileConfig }

// When an entity of each domain counts as on, for the ones that have such
// a state at all.
function isActive(domain: string, entity: EntityState) {
  switch (domain) {
    case 'binary_sensor':
    case 'update':
    case 'calendar':
    case 'input_boolean':
      return entity.state === 'on'
    case 'person':
    case 'device_tracker':
      return entity.state === 'home'
    case 'alarm_control_panel':
      return entity.state !== 'disarmed'
    case 'timer':
      return entity.state === 'active'
    default:
      return false
  }
}

// Any other entity, a sensor, a person or the weather. The line under the
// name is its state as Home Assistant words it, and a tap opens its dialog.
export default function Entity({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const domain = config.entity!.split('.')[0]
  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={!!entity && isActive(domain, entity)}
      unknownIsUnavailable={false}
      state={formatState(env.hass, entity)}
      onTap={() => moreInfo(env.host, config.entity)}
    />
  )
}
