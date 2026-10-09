import { callService, formatAttribute, formatState, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Control, Tile } from '#/tiles/Tile.tsx'
import { useEffect, useRef, useState } from 'react'

// How long the minus and plus buttons wait for another press before they
// send the new temperature, so a few presses make one change.
const SEND_MS = 700

type Props = { env: TileEnv; config: TileConfig }

// A thermostat or a water heater. The line under the name says what it is
// doing and how warm it is, and a tap opens its dialog. A wide tile adds
// minus and plus buttons for the temperature it aims for. Lit while it is
// on, warm while it heats and cool while it cools.
export default function Climate({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const domain = config.entity!.split('.')[0]
  const attributes = entity?.attributes ?? {}
  const target = typeof attributes.temperature === 'number' ? attributes.temperature : null
  const [pending, setPending] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const on = !!entity && entity.state !== 'off'
  const action = typeof attributes.hvac_action === 'string' ? attributes.hvac_action : null
  const cooling = action === 'cooling' || (!action && (entity?.state === 'cool' || entity?.state === 'dry'))

  const parts = [
    entity &&
      (action && action !== 'off' ? formatAttribute(env.hass, entity, 'hvac_action') : formatState(env.hass, entity)),
  ]
  if (entity && typeof attributes.current_temperature === 'number')
    parts.push(formatAttribute(env.hass, entity, 'current_temperature'))
  const aim = pending ?? target
  if (config.size === 'wide' && on && entity && aim !== null)
    parts.push(
      `to ${formatAttribute(env.hass, { ...entity, attributes: { ...attributes, temperature: aim } }, 'temperature')}`,
    )

  const step = typeof attributes.target_temp_step === 'number' ? attributes.target_temp_step : 0.5
  const min = typeof attributes.min_temp === 'number' ? attributes.min_temp : -Infinity
  const max = typeof attributes.max_temp === 'number' ? attributes.max_temp : Infinity
  const nudge = (by: number) => () => {
    if (aim === null) return
    const next = Math.min(max, Math.max(min, Math.round((aim + by * step) / step) * step))
    setPending(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void callService(env.hass, `${domain}.set_temperature`, { entity_id: config.entity, temperature: next }).then(
        () => setPending(null),
      )
    }, SEND_MS)
  }

  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={on}
      accent={cooling ? 'var(--_accent-cool)' : 'var(--_accent-climate)'}
      state={parts.filter(Boolean).join(' · ')}
      onTap={() => moreInfo(env.host, config.entity)}
      controls={
        target !== null && (
          <>
            <Control icon="ph:minus-bold" label="Lower the temperature" onPress={nudge(-1)} />
            <Control icon="ph:plus-bold" label="Raise the temperature" onPress={nudge(1)} />
          </>
        )
      }
    />
  )
}
