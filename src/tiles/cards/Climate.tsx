import { formatAttribute, formatState, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import TemperatureStepper from '#/tiles/cards/TemperatureStepper.tsx'
import { HvacModes } from '#/tiles/features/climate.tsx'
import { listOf } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A thermostat or a water heater. The line under the name says what it is
// doing and how warm it is, and a tap opens its dialog. A wide tile is a
// row taller: minus and plus around the temperature it aims for, or around
// the two ends of the range it keeps to, where a tap on one picks which
// the buttons move. A wide thermostat adds a button for each mode it runs
// in along the bottom, unless a feature sits beside the icon instead. Lit while it is on, warm while it heats and cool
// while it cools.
export default function Climate({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const on = !!entity && entity.state !== 'off'
  const action = typeof attributes.hvac_action === 'string' ? attributes.hvac_action : null
  const cooling = action === 'cooling' || (!action && (entity?.state === 'cool' || entity?.state === 'dry'))
  const wide = config.size === 'wide'

  const parts = [
    entity &&
      (action && action !== 'off' ? formatAttribute(env.hass, entity, 'hvac_action') : formatState(env.hass, entity)),
  ]
  if (entity && typeof attributes.current_temperature === 'number')
    parts.push(formatAttribute(env.hass, entity, 'current_temperature'))
  // A tile with minus and plus shows what it aims for between them.
  const stepped = (wide && !config.feature) || config.feature === 'target-temperature'
  if (!stepped && on && entity && typeof attributes.temperature === 'number')
    parts.push(`to ${formatAttribute(env.hass, entity, 'temperature')}`)

  const footer = entity && listOf(entity, 'hvac_modes').length > 0 && (
    <HvacModes env={env} config={config} entity={entity} />
  )

  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={on}
      accent={cooling ? 'var(--_accent-cool)' : 'var(--_accent-climate)'}
      state={parts.filter(Boolean).join(' · ')}
      onTap={() => moreInfo(env.host, config.entity)}
      controls={<TemperatureStepper env={env} entityId={config.entity!} />}
      footer={footer}
    />
  )
}
