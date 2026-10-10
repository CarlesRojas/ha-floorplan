import { callService, formatState } from '#/tiles/actions.ts'
import { Control } from '#/tiles/Control.tsx'
import { Keypad } from '#/tiles/features/Keypad.tsx'
import {
  domainOf,
  formatNumber,
  Group,
  listOf,
  MenuPill,
  numberOf,
  optionWord,
  Pill,
  Slider,
  Stepper,
  supports,
  type FeatureProps,
} from '#/tiles/features/parts.tsx'
import { linePaths, useHistory } from '#/tiles/history.ts'
import type { EntityState } from '#/types.ts'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

// The features of the rest: an alarm, a lock, a vacuum, a mower, a counter,
// a timer, a select, a number, a date, an update, a button and a sensor.

export type AlarmMode = { state: string; service: string; icon: string; label: string; bit: number }

// The modes of an alarm, in the order they show, each with the bit of
// supported_features that says the alarm has it. Disarmed it always has.
export const ALARM_MODES: AlarmMode[] = [
  { state: 'disarmed', service: 'alarm_disarm', icon: 'ph:shield-slash', label: 'Disarm', bit: 0 },
  { state: 'armed_home', service: 'alarm_arm_home', icon: 'ph:house', label: 'Home', bit: 1 },
  { state: 'armed_away', service: 'alarm_arm_away', icon: 'ph:lock-key', label: 'Away', bit: 2 },
  { state: 'armed_night', service: 'alarm_arm_night', icon: 'ph:moon', label: 'Night', bit: 4 },
  { state: 'armed_vacation', service: 'alarm_arm_vacation', icon: 'ph:airplane', label: 'Vacation', bit: 32 },
  {
    state: 'armed_custom_bypass',
    service: 'alarm_arm_custom_bypass',
    icon: 'ph:shield-star',
    label: 'Custom',
    bit: 16,
  },
]

export const alarmModes = (entity: EntityState) => ALARM_MODES.filter(mode => !mode.bit || supports(entity, mode.bit))

// Whether a mode needs the code typed first: disarming does whenever the
// alarm has a code, arming unless the alarm says it does not.
export function needsCode(entity: EntityState, mode: AlarmMode) {
  const format = entity.attributes.code_format
  if (format !== 'number' && format !== 'text') return false
  return mode.state === 'disarmed' || entity.attributes.code_arm_required !== false
}

export const codeFormat = (entity: EntityState) => (entity.attributes.code_format === 'text' ? 'text' : 'number')

// A round button for each mode the alarm has, the one it is in filled.
// A mode that needs the code opens a keypad over the dashboard first.
export function AlarmModes({ env, entity }: FeatureProps) {
  const sheet = useRef<HTMLDivElement>(null)
  const [asked, setAsked] = useState<AlarmMode | null>(null)
  const set = (mode: AlarmMode, code?: string) =>
    callService(env.hass, `alarm_control_panel.${mode.service}`, {
      entity_id: entity.entity_id,
      ...(code && { code }),
    })
  const pick = (mode: AlarmMode) => () => {
    if (entity.state === mode.state) return
    if (!needsCode(entity, mode)) return set(mode)
    setAsked(mode)
    sheet.current?.showPopover()
  }
  return (
    <>
      <Group label="Mode" radio>
        {alarmModes(entity).map(mode => (
          <Control
            key={mode.state}
            icon={mode.icon}
            label={mode.label}
            role="radio"
            checked={entity.state === mode.state}
            className="fp-mode"
            style={{ '--_mode-color': mode.bit ? 'var(--_alarm-armed)' : 'var(--_alarm-disarmed)' } as CSSProperties}
            onPress={pick(mode)}
          />
        ))}
      </Group>
      <div
        ref={sheet}
        popover="auto"
        className="fp-sheet"
        role="dialog"
        aria-label="Alarm code"
        onToggle={e => e.newState === 'closed' && setAsked(null)}
      >
        {asked && (
          <>
            <div className="fp-sheet-title">{asked.state === 'disarmed' ? 'Disarm' : `Arm ${asked.label}`}</div>
            <Keypad
              format={codeFormat(entity)}
              action={asked.state === 'disarmed' ? 'Disarm' : 'Arm'}
              onCancel={() => sheet.current?.hidePopover()}
              onSubmit={code => {
                set(asked, code)
                sheet.current?.hidePopover()
              }}
            />
          </>
        )}
      </div>
    </>
  )
}

// Lock and unlock, side by side, the one it is in filled.
export function LockCommands({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `lock.${service}`, { entity_id: entity.entity_id })
  const locked = entity.state === 'locked' || entity.state === 'locking'
  return (
    <div className="fp-group" role="radiogroup" aria-label="Lock">
      <Pill icon="ph:lock" label="Lock" checked={locked} onPress={run('lock')} />
      <Pill icon="ph:lock-open" label="Unlock" checked={!locked} onPress={run('unlock')} />
    </div>
  )
}

// How long a press on Open waits for the second press that opens the door.
const CONFIRM_MS = 4000

// Opens the door. The first press asks, a second one opens it, so a stray
// press never does.
export function OpenDoor({ env, entity }: FeatureProps) {
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    if (!asking) return
    const timer = setTimeout(() => setAsking(false), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [asking])
  const open = entity.state === 'open' || entity.state === 'opening'
  return (
    <Pill
      icon="ph:door-open"
      label={open ? 'Door open' : asking ? 'Press again to open' : 'Open the door'}
      disabled={open}
      onPress={() => {
        if (!asking) return setAsking(true)
        setAsking(false)
        void callService(env.hass, 'lock.open', { entity_id: entity.entity_id })
      }}
    />
  )
}

// The vacuum's supported_features bits.
const VACUUM = { pause: 4, stop: 8, home: 16, fanSpeed: 32, locate: 512, spot: 1024, start: 8192 }
export const VACUUM_FAN_SPEED = VACUUM.fanSpeed

// Start or pause, stop, dock, find and clean a spot, the ones it has.
export function VacuumCommands({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `vacuum.${service}`, { entity_id: entity.entity_id })
  const has = (bit: number) => supports(entity, bit)
  const cleaning = entity.state === 'cleaning'
  return (
    <Group label="Vacuum">
      {cleaning && has(VACUUM.pause) ? (
        <Control icon="ph:pause" label="Pause" onPress={run('pause')} />
      ) : (
        has(VACUUM.start) && <Control icon="ph:play" label="Start" onPress={run('start')} />
      )}
      {has(VACUUM.stop) && <Control icon="ph:stop" label="Stop" onPress={run('stop')} />}
      {has(VACUUM.home) && <Control icon="ph:house" label="Dock" onPress={run('return_to_base')} />}
      {has(VACUUM.spot) && <Control icon="ph:target" label="Clean a spot" onPress={run('clean_spot')} />}
      {has(VACUUM.locate) && <Control icon="ph:crosshair" label="Locate" onPress={run('locate')} />}
    </Group>
  )
}

export function VacuumFanSpeed({ env, entity }: FeatureProps) {
  return (
    <MenuPill
      icon="ph:fan"
      label="Suction"
      options={listOf(entity, 'fan_speed_list')}
      current={typeof entity.attributes.fan_speed === 'string' ? entity.attributes.fan_speed : null}
      word={option => optionWord(env.hass, entity, option, 'fan_speed')}
      onPick={option =>
        callService(env.hass, 'vacuum.set_fan_speed', { entity_id: entity.entity_id, fan_speed: option })
      }
    />
  )
}

// The lawn mower's supported_features bits.
const MOWER = { start: 1, pause: 2, dock: 4 }

export function MowerCommands({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `lawn_mower.${service}`, { entity_id: entity.entity_id })
  const mowing = entity.state === 'mowing'
  const has = (bit: number) => supports(entity, bit)
  return (
    <Group label="Mower">
      {mowing && has(MOWER.pause) ? (
        <Control icon="ph:pause" label="Pause" onPress={run('pause')} />
      ) : (
        has(MOWER.start) && <Control icon="ph:play" label="Start mowing" onPress={run('start_mowing')} />
      )}
      {has(MOWER.dock) && <Control icon="ph:house" label="Dock" onPress={run('dock')} />}
    </Group>
  )
}

// Down one, back to where it started, and up one.
export function CounterActions({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `counter.${service}`, { entity_id: entity.entity_id })
  return (
    <Group label="Counter">
      <Control icon="ph:minus-bold" label="Decrease" onPress={run('decrement')} />
      <Control icon="ph:arrow-counter-clockwise" label="Reset" onPress={run('reset')} />
      <Control icon="ph:plus-bold" label="Increase" onPress={run('increment')} />
    </Group>
  )
}

// Start or pause, and while it runs, cancel and finish.
export function TimerActions({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `timer.${service}`, { entity_id: entity.entity_id })
  const active = entity.state === 'active'
  const idle = entity.state === 'idle'
  return (
    <Group label="Timer">
      {active ? (
        <Control icon="ph:pause" label="Pause" onPress={run('pause')} />
      ) : (
        <Control icon="ph:play" label={idle ? 'Start' : 'Resume'} onPress={run('start')} />
      )}
      {!idle && <Control icon="ph:x-bold" label="Cancel" onPress={run('cancel')} />}
      {!idle && <Control icon="ph:flag-checkered" label="Finish" onPress={run('finish')} />}
    </Group>
  )
}

// Every option of a select, from a menu.
export function SelectOptions({ env, entity }: FeatureProps) {
  const domain = domainOf(entity)
  return (
    <MenuPill
      label="Option"
      options={listOf(entity, 'options')}
      current={entity.state}
      word={option => optionWord(env.hass, entity, option)}
      onPick={option => callService(env.hass, `${domain}.select_option`, { entity_id: entity.entity_id, option })}
    />
  )
}

// How many steps a number can have and still be a bar. One with more is
// a pair of minus and plus buttons, like Home Assistant's own.
const MAX_SLIDER_STEPS = 256

// A number along a bar, or between minus and plus when it asks for a box.
export function NumericInput({ env, entity }: FeatureProps) {
  const domain = domainOf(entity)
  const min = numberOf(entity, 'min') ?? 0
  const max = numberOf(entity, 'max') ?? 100
  const step = numberOf(entity, 'step') ?? 1
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  const value = Number(entity.state)
  const mode = entity.attributes.mode
  const box = mode === 'box' || (mode !== 'slider' && (max - min) / step > MAX_SLIDER_STEPS)
  const digits = Math.max(0, -Math.floor(Math.log10(step)))
  const format = (v: number) => `${formatNumber(env.hass, v, digits)}${unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}`
  const send = (v: number) => callService(env.hass, `${domain}.set_value`, { entity_id: entity.entity_id, value: v })
  if (!Number.isFinite(value)) return null
  return box ? (
    <Stepper label="Value" value={value} step={step} min={min} max={max} format={format} onSend={send} />
  ) : (
    <Slider label="Value" value={value} min={min} max={max} step={step} format={format} onChange={send} />
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// What a native picker for a date entity needs: the kind of picker, the
// value it starts on, and how to send the one picked.
function datePicker(entity: EntityState) {
  const domain = domainOf(entity)
  const id = { entity_id: entity.entity_id }
  if (domain === 'date')
    return { type: 'date', value: entity.state, send: (v: string) => ['date.set_value', { ...id, date: v }] as const }
  if (domain === 'datetime') {
    const d = new Date(entity.state)
    const value = Number.isNaN(d.getTime()) ? '' : `${localDate(d)}T${localTime(d)}`
    return {
      type: 'datetime-local',
      value,
      send: (v: string) => ['datetime.set_value', { ...id, datetime: new Date(v).toISOString() }] as const,
    }
  }
  const hasDate = entity.attributes.has_date !== false
  const hasTime = entity.attributes.has_time === true
  if (hasDate && hasTime)
    return {
      type: 'datetime-local',
      value: entity.state.replace(' ', 'T').slice(0, 16),
      send: (v: string) => ['input_datetime.set_datetime', { ...id, datetime: `${v.replace('T', ' ')}:00` }] as const,
    }
  if (hasTime)
    return {
      type: 'time',
      value: entity.state.slice(0, 5),
      send: (v: string) => ['input_datetime.set_datetime', { ...id, time: `${v}:00` }] as const,
    }
  return {
    type: 'date',
    value: entity.state.slice(0, 10),
    send: (v: string) => ['input_datetime.set_datetime', { ...id, date: v }] as const,
  }
}

// The date it holds, in a pill that opens the device's own picker.
export function DateSet({ env, entity }: FeatureProps) {
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const picker = datePicker(entity)
  return (
    <div className="fp-feature-date">
      <Pill
        icon="ph:calendar-dots"
        label={formatState(env.hass, entity)}
        onPress={() => {
          const field = input.current
          if (!field) return
          try {
            field.showPicker()
          } catch {
            field.focus()
          }
        }}
      />
      <input
        ref={input}
        id={id}
        className="fp-hidden-input"
        type={picker.type}
        tabIndex={-1}
        aria-hidden
        defaultValue={picker.value}
        key={picker.value}
        onChange={e => {
          if (!e.target.value) return
          const [action, data] = picker.send(e.target.value)
          void callService(env.hass, action, data)
        }}
      />
    </div>
  )
}

// Install and skip, for an update that waits.
export function UpdateActions({ env, entity }: FeatureProps) {
  const run = (service: string) => () => callService(env.hass, `update.${service}`, { entity_id: entity.entity_id })
  const waiting = entity.state === 'on'
  const installing = entity.attributes.in_progress === true || typeof entity.attributes.in_progress === 'number'
  if (!waiting) return <Pill icon="ph:check-circle" label="Up to date" disabled onPress={() => {}} />
  return (
    <div className="fp-group">
      <Pill icon="ph:skip-forward" label="Skip" disabled={installing} onPress={run('skip')} />
      {supports(entity, 1) && (
        <Pill
          icon="ph:download"
          label={installing ? 'Installing' : 'Install'}
          disabled={installing}
          onPress={run('install')}
        />
      )}
    </div>
  )
}

const PRESS: Record<string, [string, string]> = {
  button: ['button.press', 'Press'],
  input_button: ['input_button.press', 'Press'],
  script: ['script.turn_on', 'Run'],
  scene: ['scene.turn_on', 'Activate'],
}

// One wide pill that does what the button does.
export function PressButton({ env, entity }: FeatureProps) {
  const [action, label] = PRESS[domainOf(entity)] ?? PRESS.button
  return (
    <Pill
      icon="ph:hand-tap"
      label={label}
      onPress={() => callService(env.hass, action, { entity_id: entity.entity_id })}
    />
  )
}

const GRAPH_W = 300
const GRAPH_H = 44

// The last day of a reading as a line along the bottom of the tile, with
// a soft shade under it.
export function TrendGraph({ env, entity }: FeatureProps) {
  const points = useHistory(env.hass, entity.entity_id, 24)
  const id = `fp-graph-${useId().replace(/[^a-z0-9]/gi, '')}`
  const paths = points && points.length > 1 ? linePaths(points, GRAPH_W, GRAPH_H) : null
  return (
    <svg
      className="fp-sparkline"
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="The last 24 hours"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths && (
        <>
          <path d={paths.area} fill={`url(#${id})`} />
          <path d={paths.line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  )
}

// A percentage as a bar that fills as far.
export function BarGauge({ env, entity }: FeatureProps) {
  const value = Number(entity.state)
  if (!Number.isFinite(value)) return null
  const share = Math.min(1, Math.max(0, value / 100))
  return (
    <div
      className="fp-slider fp-slider-static"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      style={{ '--_share': share } as CSSProperties}
    >
      <div className="fp-slider-fill" />
      <div className="fp-slider-label">
        <span>{formatState(env.hass, entity)}</span>
      </div>
    </div>
  )
}
