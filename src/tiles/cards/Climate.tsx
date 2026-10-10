import { formatAttribute, formatState, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import TemperatureStepper from '#/tiles/cards/TemperatureStepper.tsx'
import { HvacModes } from '#/tiles/features/climate.tsx'
import { HVAC_MODES } from '#/tiles/modes.ts'
import { formatDegrees, listOf } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

type Props = { env: TileEnv; config: TileConfig }

// A thermostat or a water heater. The line under the name says what it is
// doing, how warm it is and how warm it aims to be, and a tap opens its
// dialog. A wide tile has minus and plus around the temperature it aims
// for, or around the two ends of the range it keeps to, where a tap on one
// picks which the buttons move. A wide thermostat adds a button for each
// mode it runs in across from the name, unless a feature sits beside the
// icon instead. Lit while it is on, in the color of the mode it runs in,
// which washes down from the top of the tile.
export default function Climate({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const on = !!entity && entity.state !== 'off'
  const action = typeof attributes.hvac_action === 'string' ? attributes.hvac_action : null
  const color = (entity && HVAC_MODES[entity.state]?.color) ?? 'var(--_mode-heat)'
  const wide = config.size === 'wide'

  // A tile with minus and plus shows what it aims for between them.
  const stepped = (wide && !config.feature) || config.feature === 'target-temperature'
  const now =
    entity && typeof attributes.current_temperature === 'number'
      ? formatDegrees(env.hass, attributes.current_temperature)
      : null
  const aim =
    !stepped && on && entity && typeof attributes.temperature === 'number'
      ? `to ${formatDegrees(env.hass, attributes.temperature)}`
      : null
  const parts = [
    entity &&
      (action && action !== 'off' ? formatAttribute(env.hass, entity, 'hvac_action') : formatState(env.hass, entity)),
    // How warm it is and how warm it aims to be read as one phrase.
    [now, aim].filter(Boolean).join(' '),
  ]

  const modes = entity && listOf(entity, 'hvac_modes').length > 0 && (
    <HvacModes env={env} config={config} entity={entity} />
  )

  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={on}
      accent={color}
      glow={on ? color : undefined}
      glowFrom="top"
      state={parts.filter(Boolean).join(' · ')}
      onTap={() => moreInfo(env.host, config.entity)}
      controls={<TemperatureStepper env={env} entityId={config.entity!} />}
      aside={modes}
    />
  )
}
