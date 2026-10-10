import { entityName, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { useEffect, useRef, useState } from 'react'

export type MapConfig = TileConfig & {
  // How many hours of a person's path the map draws behind them.
  hours_to_show?: number
}

type Card = HTMLElement & { hass?: unknown; setConfig?: (config: Record<string, unknown>) => void }

// Where a person, a tracker or a zone is, on Home Assistant's own map,
// framed as a tile with the name over its top left corner. The map takes
// its own drags and pinches.
export default function MapCard({ env, config }: { env: TileEnv; config: MapConfig }) {
  const entity = env.hass.states[config.entity!]
  const box = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState<Card | null>(null)
  const hours = config.hours_to_show ?? 0

  useEffect(() => {
    let live = true
    window
      .loadCardHelpers?.()
      .then(helpers => {
        if (!live) return
        const made = helpers.createCardElement({
          type: 'map',
          entities: [config.entity],
          hours_to_show: hours,
          theme_mode: 'auto',
        }) as Card
        setCard(made)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [config.entity, hours])

  useEffect(() => {
    if (!card || !box.current) return
    box.current.replaceChildren(card)
  }, [card])

  useEffect(() => {
    if (card) card.hass = env.hass
  }, [card, env.hass])

  return (
    <div className="fp-tile fp-map" data-unavailable={!entity || undefined}>
      <div ref={box} className="fp-map-box" />
      <div className="fp-map-name">{entityName(config, entity)}</div>
    </div>
  )
}
