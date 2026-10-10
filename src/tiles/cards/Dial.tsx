import { callService, formatState, haptic, type TileEnv } from '#/tiles/actions.ts'
import { Control } from '#/tiles/Control.tsx'
import { HvacModes, MENUS, ModeMenu } from '#/tiles/features/climate.tsx'
import { Toggle } from '#/tiles/features/light.tsx'
import { formatNumber, listOf, numberOf, optionWord } from '#/tiles/features/parts.tsx'
import { insideTile } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { HVAC_MODES } from '#/tiles/modes.ts'
import { Panel } from '#/tiles/Panel.tsx'
import { kelvinToRgb } from '#/signals.ts'
import type { EntityState, HomeAssistant } from '#/types.ts'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

// The ring sweeps three quarters of a circle, open at the bottom, starting
// from the bottom left.
const SWEEP = 270
const START = 135
const RADIUS = 84
const LENGTH = (2 * Math.PI * RADIUS * SWEEP) / 360
// How long the minus and plus wait for another press before they send.
const SEND_MS = 700
// How long a value that was sent shows if Home Assistant never takes it.
const HOLD_MS = 5000

// What the ring of one entity sets: its values, one or the two ends of a
// range, their bounds, and how to send new ones.
type Model = {
  values: number[]
  min: number
  max: number
  step: number
  color: string
  // Above the value, like Heat to.
  label: string
  // Under it, like what the room is at now.
  now?: string
  format: (value: number) => string
  send: (values: number[]) => void
  // Off, the ring is dim and drags nothing.
  off?: boolean
}

const degrees = (hass: HomeAssistant, value: number) => `${formatNumber(hass, value)}°`

function model(hass: HomeAssistant, entity: EntityState): Model | null {
  const domain = entity.entity_id.split('.')[0]
  const target = { entity_id: entity.entity_id }
  if (domain === 'light') {
    const brightness = numberOf(entity, 'brightness')
    const on = entity.state === 'on'
    const rgb = entity.attributes.rgb_color
    const kelvin = numberOf(entity, 'color_temp_kelvin')
    const color = Array.isArray(rgb)
      ? `rgb(${rgb.join(',')})`
      : kelvin
        ? `rgb(${kelvinToRgb(kelvin)
            .map(c => Math.round(c * 255))
            .join(',')})`
        : 'var(--_accent-light)'
    return {
      values: [on && brightness !== null ? Math.max(1, Math.round((brightness / 255) * 100)) : 0],
      min: 0,
      max: 100,
      step: 1,
      color,
      label: 'Brightness',
      format: value => (value > 0 ? `${Math.round(value)}%` : 'Off'),
      send: ([value]) =>
        callService(
          hass,
          value > 0 ? 'light.turn_on' : 'light.turn_off',
          value > 0 ? { ...target, brightness_pct: value } : target,
        ),
    }
  }
  if (domain === 'humidifier') {
    const humidity = numberOf(entity, 'humidity')
    if (humidity === null) return null
    const current = numberOf(entity, 'current_humidity')
    return {
      values: [humidity],
      min: numberOf(entity, 'min_humidity') ?? 0,
      max: numberOf(entity, 'max_humidity') ?? 100,
      step: 1,
      color: 'var(--_accent-cool)',
      label:
        entity.state === 'on'
          ? optionWord(
              hass,
              entity,
              String(entity.attributes.action ?? 'on'),
              entity.attributes.action ? 'action' : undefined,
            )
          : 'Off',
      now: current !== null ? `Now ${Math.round(current)}%` : undefined,
      format: value => `${Math.round(value)}%`,
      send: ([value]) => callService(hass, 'humidifier.set_humidity', { ...target, humidity: value }),
      off: entity.state !== 'on',
    }
  }
  const temperature = numberOf(entity, 'temperature')
  const low = numberOf(entity, 'target_temp_low')
  const high = numberOf(entity, 'target_temp_high')
  const range = temperature === null && low !== null && high !== null
  if (temperature === null && !range) return null
  const current = numberOf(entity, 'current_temperature')
  const action = typeof entity.attributes.hvac_action === 'string' ? entity.attributes.hvac_action : null
  const mode = entity.state
  return {
    values: range ? [low, high] : [temperature!],
    min: numberOf(entity, 'min_temp') ?? 7,
    max: numberOf(entity, 'max_temp') ?? 35,
    step: numberOf(entity, 'target_temp_step') ?? (domain === 'water_heater' ? 1 : 0.5),
    color:
      domain === 'water_heater'
        ? 'var(--_accent-climate)'
        : (HVAC_MODES[mode]?.color ?? (mode === 'off' ? 'currentColor' : 'var(--_accent-climate)')),
    label: action
      ? optionWord(hass, entity, action, 'hvac_action')
      : mode === 'off'
        ? 'Off'
        : formatState(hass, entity),
    now: current !== null ? `Now ${degrees(hass, current)}` : undefined,
    format: value => degrees(hass, value),
    send: values =>
      callService(
        hass,
        `${domain}.set_temperature`,
        range
          ? { ...target, target_temp_low: values[0], target_temp_high: values[1] }
          : { ...target, temperature: values[0] },
      ),
    off: mode === 'off',
  }
}

// A value's place along the ring, from 0 at its start to 1 at its end.
const shareOf = (m: Model, value: number) => Math.min(Math.max((value - m.min) / (m.max - m.min || 1), 0), 1)
const point = (share: number) => {
  const angle = ((START + share * SWEEP) * Math.PI) / 180
  return { x: 100 + RADIUS * Math.cos(angle), y: 100 + RADIUS * Math.sin(angle) }
}

// The values sent, shown until Home Assistant reports them back.
function useHeldValues(reported: number[]) {
  const [held, setHeld] = useState<number[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const key = reported.join(',')
  useEffect(() => {
    if (held && held.join(',') === key) setHeld(null)
  }, [held, key])
  const hold = (values: number[]) => {
    setHeld(values)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHeld(null), HOLD_MS)
  }
  return [held ?? reported, hold] as const
}

// A thermostat, a water heater, a humidifier or a light on a big ring, the
// whole width: drag the ring's knob, or press minus and plus, to set the
// temperature, the humidity or the brightness it holds. The ring fills in
// the color of what it is doing, like orange to heat. Under it, the modes
// or the switch.
export default function Dial({ env, config }: { env: TileEnv; config: TileConfig }) {
  const entity = env.hass.states[config.entity!]
  const m = entity ? model(env.hass, entity) : null
  const [values, hold] = useHeldValues(m?.values ?? [])
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const send = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(send.current), [])
  const domain = config.entity!.split('.')[0]

  const footer = entity && (
    <div className="fp-dial-footer">
      {domain === 'climate' && listOf(entity, 'hvac_modes').length > 0 && (
        <HvacModes env={env} config={config} entity={entity} />
      )}
      {domain === 'water_heater' && listOf(entity, 'operation_list').length > 0 && (
        <ModeMenu env={env} config={config} entity={entity} menu={MENUS['operation-modes']} />
      )}
      {(domain === 'humidifier' || domain === 'light') && <Toggle env={env} config={config} entity={entity} />}
      {domain === 'humidifier' && listOf(entity, 'available_modes').length > 0 && (
        <ModeMenu env={env} config={config} entity={entity} menu={MENUS.modes} />
      )}
    </div>
  )

  if (!entity || !m)
    return (
      <Panel env={env} config={config} entity={entity} state={formatState(env.hass, entity)}>
        {footer}
      </Panel>
    )

  const snap = (value: number) =>
    Math.min(m.max, Math.max(m.min, Math.round((value - m.min) / m.step) * m.step + m.min))
  // Each end of a range stays on its own side of the other.
  const place = (index: number, value: number) => {
    const next = [...values]
    next[index] = snap(value)
    if (next.length === 2) {
      if (index === 0) next[0] = Math.min(next[0], next[1])
      else next[1] = Math.max(next[1], next[0])
    }
    return next
  }
  const commit = (next: number[], wait: number) => {
    hold(next)
    clearTimeout(send.current)
    send.current = setTimeout(() => m.send(next), wait)
  }

  const valueAt = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * 200 - 100
    const y = ((e.clientY - box.top) / box.height) * 200 - 100
    let along = ((Math.atan2(y, x) * 180) / Math.PI - START + 720) % 360
    // Past either end, in the gap at the bottom, it holds at the nearer end.
    if (along > SWEEP) along = along > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP
    return m.min + (along / SWEEP) * (m.max - m.min)
  }
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (m.off && domain !== 'light') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const value = valueAt(e)
    const index = values.length === 2 ? (Math.abs(value - values[0]) <= Math.abs(value - values[1]) ? 0 : 1) : 0
    setActive(index)
    setDragging(true)
    haptic('selection')
    hold(place(index, value))
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const next = place(active, valueAt(e))
    if (next.join(',') !== values.join(',')) {
      if (next[active] === m.min || next[active] === m.max) haptic('selection')
      hold(next)
    }
  }
  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    commit(values, 0)
  }
  const nudge = (by: number) => () => commit(place(active, values[active] + by * m.step), SEND_MS)

  const first = shareOf(m, values.length === 2 ? values[0] : m.min)
  const last = shareOf(m, values[values.length - 1])
  return (
    <Panel env={env} config={config} entity={entity} state={formatState(env.hass, entity)} accent={m.color}>
      <div
        className="fp-dial"
        data-off={m.off || undefined}
        data-dragging={dragging || undefined}
        style={{ '--_dial': m.color } as CSSProperties}
      >
        <svg
          {...insideTile}
          viewBox="0 0 200 200"
          className="fp-dial-ring"
          role="slider"
          tabIndex={0}
          aria-label={m.label}
          aria-valuemin={m.min}
          aria-valuemax={m.max}
          aria-valuenow={values[active]}
          aria-valuetext={m.format(values[active])}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={e => {
            const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
            if (!by) return
            e.preventDefault()
            e.stopPropagation()
            nudge(by)()
          }}
        >
          <g transform={`rotate(${START} 100 100)`}>
            <circle className="fp-dial-track" cx="100" cy="100" r={RADIUS} strokeDasharray={`${LENGTH} 999`} />
            <circle
              className="fp-dial-fill"
              cx="100"
              cy="100"
              r={RADIUS}
              strokeDasharray={`${Math.max(LENGTH * (last - first), 0.01)} 999`}
              strokeDashoffset={-LENGTH * first}
            />
          </g>
          {values.map((value, i) => {
            const at = point(shareOf(m, value))
            return (
              <circle
                key={i}
                className="fp-dial-knob"
                data-active={i === active || undefined}
                cx={at.x}
                cy={at.y}
                r="11"
              />
            )
          })}
        </svg>
        <div className="fp-dial-center">
          <div className="fp-dial-label">{m.label}</div>
          <div className="fp-dial-value">
            {values.length === 2 ? (
              values.map((value, i) => (
                <button
                  {...insideTile}
                  key={i}
                  type="button"
                  className="fp-dial-end"
                  aria-pressed={i === active}
                  onClick={e => {
                    e.stopPropagation()
                    setActive(i)
                  }}
                >
                  {m.format(value)}
                </button>
              ))
            ) : (
              <span>{m.format(values[0])}</span>
            )}
          </div>
          {m.now && <div className="fp-dial-now">{m.now}</div>}
        </div>
        <div className="fp-dial-buttons">
          <Control icon="ph:minus-bold" label="Lower" onPress={nudge(-1)} />
          <Control icon="ph:plus-bold" label="Raise" onPress={nudge(1)} />
        </div>
      </div>
      {footer}
    </Panel>
  )
}
