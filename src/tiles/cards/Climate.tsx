import { callService, formatAttribute, formatState, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import { insideTile } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Control, Tile } from '#/tiles/Tile.tsx'
import type { EntityState } from '#/types.ts'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

// How long the minus and plus buttons wait for another press before they
// send the new temperature, so a few presses make one change.
const SEND_MS = 700

// The modes a thermostat can run in, in the order its buttons go, each with
// its icon and the color its button takes while chosen. One it names that
// is not here goes at the end.
const MODES: Record<string, { icon: string; color?: string }> = {
  auto: { icon: 'ph:sparkle', color: 'var(--_accent)' },
  heat_cool: { icon: 'ph:thermometer', color: 'var(--_accent-climate)' },
  heat: { icon: 'ph:fire', color: 'var(--_accent-climate)' },
  cool: { icon: 'ph:snowflake', color: 'var(--_mode-cool)' },
  dry: { icon: 'ph:drop', color: 'var(--_mode-dry)' },
  fan_only: { icon: 'ph:fan', color: 'var(--_accent)' },
  off: { icon: 'ph:power-bold' },
}
const ORDER = Object.keys(MODES)

// How long a new temperature shows after it is sent if Home Assistant never
// says it took it.
const HOLD_MS = 5000

type Aim = { temperature?: number; low?: number; high?: number }

type Props = { env: TileEnv; config: TileConfig }

// A thermostat or a water heater. The line under the name says what it is
// doing and how warm it is, and a tap opens its dialog. A wide tile is a
// row taller: minus and plus around the temperature it aims for, or around
// the two ends of the range it keeps to, where a tap on one picks which
// the buttons move. A wide thermostat adds a button for each mode it runs
// in along the bottom. Lit while it is on, warm while it heats and cool
// while it cools.
export default function Climate({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const domain = config.entity!.split('.')[0]
  const attributes = entity?.attributes ?? {}
  const number = (key: string) => (typeof attributes[key] === 'number' ? (attributes[key] as number) : null)
  const target = number('temperature')
  const range = target === null && number('target_temp_low') !== null && number('target_temp_high') !== null
  const [pending, setPending] = useState<Aim | null>(null)
  const [end, setEnd] = useState<'low' | 'high'>('high')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      clearTimeout(hold.current)
    },
    [],
  )

  const on = !!entity && entity.state !== 'off'
  const action = typeof attributes.hvac_action === 'string' ? attributes.hvac_action : null
  const cooling = action === 'cooling' || (!action && (entity?.state === 'cool' || entity?.state === 'dry'))
  const wide = config.size === 'wide'

  // A new temperature shows until Home Assistant reports it, so the old one
  // never flashes back in between. Once it does, what it reports shows.
  const reported = (key: keyof Aim) => number(key === 'temperature' ? key : `target_temp_${key}`)
  const held =
    pending && (Object.keys(pending) as (keyof Aim)[]).some(key => pending[key] !== reported(key)) ? pending : null
  const aim = {
    temperature: held?.temperature ?? target ?? undefined,
    low: held?.low ?? number('target_temp_low') ?? undefined,
    high: held?.high ?? number('target_temp_high') ?? undefined,
  }

  const parts = [
    entity &&
      (action && action !== 'off' ? formatAttribute(env.hass, entity, 'hvac_action') : formatState(env.hass, entity)),
  ]
  if (entity && typeof attributes.current_temperature === 'number')
    parts.push(formatAttribute(env.hass, entity, 'current_temperature'))
  // A wide tile shows what it aims for in its own buttons.
  if (!wide && on && entity && aim.temperature !== undefined)
    parts.push(
      `to ${formatAttribute(env.hass, { ...entity, attributes: { ...attributes, temperature: aim.temperature } }, 'temperature')}`,
    )

  const step = number('target_temp_step') ?? (domain === 'water_heater' ? 1 : 0.5)
  const min = number('min_temp') ?? -Infinity
  const max = number('max_temp') ?? Infinity
  const nudge = (by: number) => () => {
    const key = range ? end : 'temperature'
    const now = aim[key]
    if (now === undefined) return
    // Each end of a range stays on its own side of the other.
    const floor = key === 'high' ? Math.max(min, aim.low ?? min) : min
    const ceiling = key === 'low' ? Math.min(max, aim.high ?? max) : max
    const next = Math.min(ceiling, Math.max(floor, Math.round((now + by * step) / step) * step))
    const merged = { ...held, [key]: next }
    setPending(merged)
    clearTimeout(timer.current)
    clearTimeout(hold.current)
    timer.current = setTimeout(() => {
      const data = range
        ? { target_temp_low: merged.low ?? aim.low, target_temp_high: merged.high ?? aim.high }
        : { temperature: next }
      void callService(env.hass, `${domain}.set_temperature`, { entity_id: config.entity, ...data })
      hold.current = setTimeout(() => setPending(null), HOLD_MS)
    }, SEND_MS)
  }

  const degrees = (value: number | undefined) =>
    value === undefined
      ? ''
      : `${new Intl.NumberFormat(env.hass.locale?.language, { maximumFractionDigits: 1 }).format(value)}°`

  const stepper = wide && (range || aim.temperature !== undefined) && (
    <>
      <Control icon="ph:minus-bold" label="Lower the temperature" onPress={nudge(-1)} />
      {range ? (
        <span className="fp-stepper-range">
          <End label="Lowest" value={degrees(aim.low)} picked={end === 'low'} onPick={() => setEnd('low')} />
          <End label="Highest" value={degrees(aim.high)} picked={end === 'high'} onPick={() => setEnd('high')} />
        </span>
      ) : (
        <span className="fp-stepper-value" aria-live="polite">
          {degrees(aim.temperature)}
        </span>
      )}
      <Control icon="ph:plus-bold" label="Raise the temperature" onPress={nudge(1)} />
    </>
  )

  const modeWord = (mode: string) => {
    const worded = entity && env.hass.formatEntityState?.(entity, mode)
    if (worded && worded !== mode) return worded
    const spaced = mode.replace(/_/g, ' ')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }

  const rank = (mode: string) => (ORDER.includes(mode) ? ORDER.indexOf(mode) : ORDER.length)
  const modes = listOf(entity, 'hvac_modes').sort((a, b) => rank(a) - rank(b))
  const footer = modes.length > 0 && (
    <div className="fp-modes" role="radiogroup" aria-label="Mode">
      {modes.map(mode => (
        <Control
          key={mode}
          icon={MODES[mode]?.icon ?? 'ph:circle'}
          label={modeWord(mode)}
          role="radio"
          checked={entity?.state === mode}
          className="fp-mode"
          style={{ '--_mode-color': MODES[mode]?.color } as CSSProperties}
          onPress={() =>
            entity?.state !== mode &&
            callService(env.hass, 'climate.set_hvac_mode', { entity_id: config.entity, hvac_mode: mode })
          }
        />
      ))}
    </div>
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
      controls={stepper}
      footer={footer}
    />
  )
}

// The choices an entity lists in one of its attributes.
function listOf(entity: EntityState | undefined, attribute: string) {
  const list = entity?.attributes[attribute]
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []
}

type EndProps = { label: string; value: string; picked: boolean; onPick: () => void }

// One end of a range, which a tap picks for the minus and plus to move.
function End({ label, value, picked, onPick }: EndProps) {
  return (
    <button
      {...insideTile}
      type="button"
      aria-label={`${label} ${value}`}
      aria-pressed={picked}
      className="fp-stepper-end"
      onClick={e => {
        e.stopPropagation()
        onPick()
      }}
    >
      {value}
    </button>
  )
}
