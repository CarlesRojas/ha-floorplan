import { callService, formatAttribute, formatState, haptic, moreInfo, type TileEnv } from '#/tiles/actions.ts'
import { insideTile } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { menuKeys, openMenu } from '#/tiles/menu.ts'
import { Control, Tile } from '#/tiles/Tile.tsx'
import type { EntityState } from '#/types.ts'
import { useEffect, useRef, useState } from 'react'

// How long the minus and plus buttons wait for another press before they
// send the new temperature, so a few presses make one change.
const SEND_MS = 700

// The modes a thermostat can run in, in the order its buttons go, each with
// its icon. One it names that is not here goes at the end.
const MODES: Record<string, string> = {
  auto: 'ph:sparkle',
  heat_cool: 'ph:thermometer',
  heat: 'ph:fire',
  cool: 'ph:snowflake',
  dry: 'ph:drop',
  fan_only: 'ph:fan',
  off: 'ph:power',
}

// The settings in the menu of a wide tile: the attribute that lists the
// choices, the one that holds the current choice, and the action that sets it.
const SETTINGS = [
  { title: 'Mode', list: 'operation_list', current: 'operation_mode', service: 'set_operation_mode' },
  { title: 'Fan', list: 'fan_modes', current: 'fan_mode', service: 'set_fan_mode' },
  { title: 'Preset', list: 'preset_modes', current: 'preset_mode', service: 'set_preset_mode' },
  { title: 'Swing', list: 'swing_modes', current: 'swing_mode', service: 'set_swing_mode' },
  {
    title: 'Side to side swing',
    list: 'swing_horizontal_modes',
    current: 'swing_horizontal_mode',
    service: 'set_swing_horizontal_mode',
  },
]

type Aim = { temperature?: number; low?: number; high?: number }

type Props = { env: TileEnv; config: TileConfig }

// A thermostat or a water heater. The line under the name says what it is
// doing and how warm it is, and a tap opens its dialog. A wide tile is a
// row taller: minus and plus around the temperature it aims for, or around
// the two ends of the range it keeps to, where a tap on one picks which
// the buttons move. Along the bottom a button for each mode it runs in, and
// a menu for its fan, preset and swing. Lit while it is on, warm while it
// heats and cool while it cools.
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
  const anchor = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const on = !!entity && entity.state !== 'off'
  const action = typeof attributes.hvac_action === 'string' ? attributes.hvac_action : null
  const cooling = action === 'cooling' || (!action && (entity?.state === 'cool' || entity?.state === 'dry'))
  const wide = config.size === 'wide'

  const aim = {
    temperature: pending?.temperature ?? target ?? undefined,
    low: pending?.low ?? number('target_temp_low') ?? undefined,
    high: pending?.high ?? number('target_temp_high') ?? undefined,
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
    const merged = { ...pending, [key]: next }
    setPending(merged)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const data = range
        ? { target_temp_low: merged.low ?? aim.low, target_temp_high: merged.high ?? aim.high }
        : { temperature: next }
      void callService(env.hass, `${domain}.set_temperature`, { entity_id: config.entity, ...data }).then(() =>
        setPending(null),
      )
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

  const word = (attribute: string, value: string) => {
    const worded = entity && env.hass.formatEntityAttributeValue?.(entity, attribute, value)
    if (worded && worded !== value) return worded
    const spaced = value.replace(/_/g, ' ')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }
  const modeWord = (mode: string) => {
    const worded = entity && env.hass.formatEntityState?.(entity, mode)
    return worded && worded !== mode ? worded : word('hvac_mode', mode)
  }

  const modes = listOf(entity, 'hvac_modes').sort(
    (a, b) => (MODES[a] ? Object.keys(MODES).indexOf(a) : 99) - (MODES[b] ? Object.keys(MODES).indexOf(b) : 99),
  )
  const settings = SETTINGS.filter(setting => listOf(entity, setting.list).length > 1)
  const run = (service: string, data: Record<string, unknown>) =>
    callService(env.hass, `${domain}.${service}`, { entity_id: config.entity, ...data })
  const open = () => openMenu(menu.current, anchor.current?.getBoundingClientRect())
  // With no buttons for its modes, the menu says the first setting it holds.
  const first = settings[0]
  const footer = (modes.length > 0 || settings.length > 0) && (
    <>
      {modes.length > 0 && (
        <div className="fp-modes" role="radiogroup" aria-label="Mode">
          {modes.map(mode => (
            <Control
              key={mode}
              icon={MODES[mode] ?? 'ph:circle'}
              label={modeWord(mode)}
              role="radio"
              checked={entity?.state === mode}
              className="fp-mode"
              onPress={() => entity?.state !== mode && run('set_hvac_mode', { hvac_mode: mode })}
            />
          ))}
        </div>
      )}
      {settings.length > 0 &&
        (modes.length > 0 ? (
          <div className="fp-controls">
            <Control icon="ph:sliders-horizontal" label="More settings" onPress={open} />
          </div>
        ) : (
          <button
            {...insideTile}
            type="button"
            className="fp-chip"
            aria-haspopup="menu"
            onClick={e => {
              e.stopPropagation()
              haptic('selection')
              open()
            }}
          >
            <span className="min-w-0 truncate">
              {typeof attributes[first.current] === 'string'
                ? word(first.current, attributes[first.current] as string)
                : first.title}
            </span>
            <Icon icon="ph:caret-down" on className="fp-chip-caret" />
          </button>
        ))}
    </>
  )

  return (
    <div ref={anchor} className="h-full">
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
      {settings.length > 0 && (
        <div ref={menu} popover="auto" role="menu" className="fp-menu" onKeyDown={menuKeys}>
          {settings.map(setting => (
            <div key={setting.list} role="group" aria-label={setting.title}>
              <div className="fp-menu-heading">{setting.title}</div>
              {listOf(entity, setting.list).map(option => {
                const chosen = attributes[setting.current] === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={chosen}
                    className="fp-option"
                    onClick={() => {
                      menu.current?.hidePopover()
                      if (!chosen) run(setting.service, { [setting.current]: option })
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{word(setting.current, option)}</span>
                    {chosen && <Icon icon="ph:check" className="fp-check" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
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
