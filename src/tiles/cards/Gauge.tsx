import { entityName, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { formatNumber } from '#/tiles/features/parts.tsx'
import { useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import type { CSSProperties } from 'react'

export type GaugeConfig = TileConfig & { min?: number; max?: number }

// The ring sweeps three quarters of a circle, open at the bottom.
const SWEEP = 270
const RADIUS = 42
const LENGTH = (2 * Math.PI * RADIUS * SWEEP) / 360

// A reading on a ring, like a battery or a humidity, as tall as a tile with
// a control: the ring fills in the accent as far as the value, which sits
// in large type in its middle with the name under it.
export default function Gauge({ env, config }: { env: TileEnv; config: GaugeConfig }) {
  const entity = env.hass.states[config.entity!]
  const value = Number(entity?.state)
  const known = Number.isFinite(value) && entity?.state !== ''
  const unit = typeof entity?.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  // A number entity says its own range, like 1 to 5 for a pump's speed.
  const own = (key: 'min' | 'max') => {
    const v = entity?.attributes[key] ?? entity?.attributes[`${key}imum`]
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
  }
  const min = config.min ?? own('min') ?? 0
  const max = config.max ?? own('max') ?? (unit === '%' ? 100 : Math.max(100, Math.ceil(value)))
  const share = known ? Math.min(Math.max((value - min) / (max - min || 1), 0), 1) : 0
  const open = () => moreInfo(env.host, config.entity)
  const { pressed, handlers } = useTileGestures({
    haptics: config.haptic !== false,
    onTap: () => runAction(env, config.tap_action, open),
    onHold: () => runAction(env, config.hold_action, open),
  })
  const name = entityName(config, entity)
  return (
    <div
      {...handlers}
      role="meter"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={known ? value : undefined}
      data-pressed={pressed || undefined}
      data-unavailable={!known || undefined}
      className="fp-tile fp-gauge"
      style={config.color ? ({ '--_tile-accent': config.color } as CSSProperties) : undefined}
    >
      <svg viewBox="0 0 100 92" className="fp-gauge-ring" aria-hidden="true">
        <g transform={`rotate(${90 + (360 - SWEEP) / 2} 50 50)`}>
          <circle className="fp-gauge-track" cx="50" cy="50" r={RADIUS} strokeDasharray={`${LENGTH} 999`} />
          <circle className="fp-gauge-fill" cx="50" cy="50" r={RADIUS} strokeDasharray={`${LENGTH * share} 999`} />
        </g>
      </svg>
      <div className="fp-gauge-center">
        <div className="fp-gauge-value">
          {known ? formatNumber(env.hass, value, Math.abs(value) < 10 ? 1 : 0) : '–'}
          {unit && <span className="fp-gauge-unit">{unit}</span>}
        </div>
        <div className="fp-name">{name}</div>
      </div>
    </div>
  )
}
