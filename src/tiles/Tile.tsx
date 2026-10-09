import { cn } from '#/lib/utils.ts'
import { entityName, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { insideTile, useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { EntityState } from '#/types.ts'
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  env: TileEnv
  config: TileConfig
  entity: EntityState | undefined
  active?: boolean
  // The color the icon takes while the tile is active.
  accent?: string
  // A color that washes over an active tile from its top left corner, like
  // the color a light shines in.
  glow?: string
  state: ReactNode
  // What a tap does when the config sets no tap_action.
  onTap?: () => void
  // A switch says whether it is on to a screen reader. A button says it
  // only when it stays pressed, like a cover that is open.
  role?: 'button' | 'switch'
  toggles?: boolean
  // Buttons shown in the top right corner of a wide tile.
  controls?: ReactNode
  // A row of buttons along the bottom of a wide tile, under the name.
  footer?: ReactNode
  // Whether an unknown state counts as unavailable. A button that was
  // never pressed has no time to show and says unknown, yet still works.
  unknownIsUnavailable?: boolean
}

// The shell every entity tile shares: the icon on top, the name and a
// dimmer state line under it, and on a wide tile a row of buttons across
// from the icon and, for some, another along the bottom. Active tiles are opaque and light, the rest are frosted glass.
export function Tile({
  env,
  config,
  entity,
  active = false,
  accent,
  glow,
  state,
  onTap,
  role = 'button',
  toggles = false,
  controls,
  footer,
  unknownIsUnavailable = true,
}: Props) {
  const unavailable = !entity || entity.state === 'unavailable' || (unknownIsUnavailable && entity.state === 'unknown')
  const { pressed, handlers } = useTileGestures({
    haptics: config.haptic !== false,
    onTap: unavailable ? undefined : () => runAction(env, config.tap_action, () => onTap?.()),
    onHold: () => runAction(env, config.hold_action, () => moreInfo(env.host, config.entity)),
  })
  const shown = unavailable ? 'Unavailable' : (config.state_text ?? state)
  const name = entityName(config, entity)
  const on = active && !unavailable
  return (
    <div
      {...handlers}
      role={role}
      tabIndex={0}
      aria-label={name}
      aria-pressed={role === 'button' && toggles ? on : undefined}
      aria-checked={role === 'switch' ? on : undefined}
      aria-disabled={unavailable || undefined}
      data-active={on || undefined}
      data-pressed={(pressed && !unavailable) || undefined}
      data-unavailable={unavailable || undefined}
      className="fp-tile"
      style={{ '--_tile-accent': config.color ?? accent, '--_tile-glow': glow } as CSSProperties}
    >
      <div className="fp-top">
        <Icon
          icon={config.icon ?? defaultIcon(config.entity, entity?.attributes.device_class, entity?.state)}
          on={on}
        />
        {config.size === 'wide' && controls && !unavailable && <div className="fp-controls">{controls}</div>}
      </div>
      <div className="fp-text">
        <div className="fp-name">{name}</div>
        <div className="fp-state">{shown}</div>
      </div>
      {config.size === 'wide' && footer && !unavailable && <div className="fp-footer">{footer}</div>}
    </div>
  )
}

type ControlProps = {
  icon: string
  label: string
  onPress: () => void
  className?: string
  // One of a set where only one is chosen, like the mode of a thermostat.
  role?: 'radio'
  checked?: boolean
  style?: CSSProperties
}

// One round button inside a wide tile. Pressing it never presses the tile.
export function Control({ icon, label, onPress, className, role, checked, style }: ControlProps) {
  return (
    <button
      {...insideTile}
      type="button"
      role={role}
      aria-checked={role === 'radio' ? !!checked : undefined}
      aria-label={label}
      title={label}
      className={cn('fp-control', className)}
      style={style}
      onClick={e => {
        e.stopPropagation()
        onPress()
      }}
    >
      <Icon icon={icon} on />
    </button>
  )
}
