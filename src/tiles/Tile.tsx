import { entityName, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { addsRow, besideIcon, Feature, featureState, isWide } from '#/tiles/features/index.tsx'
import type { Preview } from '#/tiles/features/parts.tsx'
import { useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { EntityState } from '#/types.ts'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Props = {
  env: TileEnv
  config: TileConfig
  entity: EntityState | undefined
  active?: boolean
  // Looks like a tile that is off while it still says it is on, for a
  // tile drawn on in part over it, like a light's brightness.
  looksOff?: boolean
  // Going back to off slowly, like a button a moment after it was pressed.
  fading?: boolean
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
  // A row of buttons along the bottom of a wide tile, under the name. The
  // feature the config names takes its place, at any size.
  footer?: ReactNode
  // Whether an unknown state counts as unavailable. A button that was
  // never pressed has no time to show and says unknown, yet still works.
  unknownIsUnavailable?: boolean
}

// How long a sent preview waits for Home Assistant before it gives up.
const PREVIEW_MS = 5000

// The icon set for the entity in Home Assistant, in its settings or its
// YAML, picked as `ph:` to match the other tiles or as any other icon.
const entityIcon = (entity: EntityState | undefined) =>
  typeof entity?.attributes.icon === 'string' && entity.attributes.icon ? entity.attributes.icon : undefined

// The shell every entity tile shares: the icon on top, the name and a
// dimmer state line under it, and on a wide tile a row of buttons across
// from the icon and, for some, another along the bottom. Active tiles are opaque and light, the rest are frosted glass.
export function Tile({
  env,
  config,
  entity,
  active = false,
  looksOff = false,
  fading = false,
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
  // Where a feature beside the icon is being moved to, shown on the tile
  // until Home Assistant says the entity changed, so it does not flash back
  // to what it was in between.
  const [preview, setPreview] = useState<Preview | null>(null)
  useEffect(() => setPreview(p => (p?.sent ? null : p)), [entity])
  useEffect(() => {
    if (!preview?.sent) return
    const timer = setTimeout(() => setPreview(null), PREVIEW_MS)
    return () => clearTimeout(timer)
  }, [preview])
  const beside = besideIcon(config.feature) && !unavailable
  const wide = isWide(config, entity)
  const said = (active && !unavailable && featureState(config.feature, entity!)) || state
  const shown = unavailable ? 'Unavailable' : preview ? preview.state : (config.state_text ?? said)
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
      data-active={(on && !looksOff) || undefined}
      data-pressed={(pressed && !unavailable) || undefined}
      data-fading={fading || undefined}
      data-unavailable={unavailable || undefined}
      data-wide={wide || undefined}
      className="fp-tile"
      style={
        {
          '--_tile-accent': preview?.color
            ? `color-mix(in oklab, ${preview.color}, black 15%)`
            : (config.color ?? accent),
          '--_tile-glow': preview?.color ?? glow,
        } as CSSProperties
      }
    >
      <div className="fp-top">
        <Icon
          icon={
            config.icon ??
            entityIcon(entity) ??
            config.piece_icon ??
            defaultIcon(config.entity, entity?.attributes.device_class, entity?.state)
          }
          on={(on && !looksOff) || fading}
        />
        {beside ? (
          <div className="fp-beside">
            <Feature env={env} config={config} entity={entity!} onPreview={setPreview} />
          </div>
        ) : (
          wide && controls && !unavailable && <div className="fp-controls">{controls}</div>
        )}
      </div>
      <div className="fp-text">
        <div className="fp-name">{name}</div>
        <div className="fp-state">{shown}</div>
      </div>
      {addsRow(config.feature)
        ? !unavailable && (
            <div className="fp-footer">
              <Feature env={env} config={config} entity={entity!} />
            </div>
          )
        : wide && footer && !unavailable && !besideIcon(config.feature) && <div className="fp-footer">{footer}</div>}
    </div>
  )
}
