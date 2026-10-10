import { cn } from '#/lib/utils.ts'
import { entityName, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { EntityState } from '#/types.ts'
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  env: TileEnv
  config: TileConfig
  entity: EntityState | undefined
  state: ReactNode
  // The color of the icon, like red for an armed alarm.
  accent?: string
  // What sits across from the name, like the range of a graph.
  aside?: ReactNode
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

// The shell of a card bigger than a tile, like the alarm panel or the
// calendar: the same frosted glass, with the icon, the name and the state
// along the top and the card's own controls under them. A tap on the top
// opens the entity's dialog, and the rest is the card's to handle.
export function Panel({ env, config, entity, state, accent, aside, className, style, children }: Props) {
  const open = () => moreInfo(env.host, config.entity)
  const { pressed, handlers } = useTileGestures({
    haptics: config.haptic !== false,
    onTap: () => runAction(env, config.tap_action, open),
    onHold: () => runAction(env, config.hold_action, open),
  })
  const unavailable = !entity || entity.state === 'unavailable'
  const name = entityName(config, entity)
  const icon =
    config.icon ??
    (typeof entity?.attributes.icon === 'string' && entity.attributes.icon ? entity.attributes.icon : undefined) ??
    defaultIcon(config.entity, entity?.attributes.device_class, entity?.state)
  return (
    <div
      className={cn('fp-tile fp-panel', className)}
      data-unavailable={unavailable || undefined}
      style={{ '--_tile-accent': config.color ?? accent, ...style } as CSSProperties}
    >
      <div
        {...handlers}
        role="button"
        tabIndex={0}
        aria-label={name}
        data-pressed={pressed || undefined}
        className="fp-panel-head"
      >
        <span className="fp-panel-icon">
          <Icon icon={icon} on />
        </span>
        <div className="fp-text">
          <div className="fp-name">{name}</div>
          <div className="fp-state">{unavailable ? 'Unavailable' : (config.state_text ?? state)}</div>
        </div>
        {aside && <div className="fp-panel-aside">{aside}</div>}
      </div>
      {!unavailable && children}
    </div>
  )
}
