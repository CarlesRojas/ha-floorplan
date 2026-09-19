import { CARD_BORDER_RADIUS_PX, DEFAULT_ASPECT_RATIO } from '#/constants.ts'
import Scene from '#/scene/Scene.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import type { CSSProperties } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

function aspectRatio(value: string | undefined) {
  const match = value?.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/)
  if (!match) return DEFAULT_ASPECT_RATIO
  return `${match[1]} / ${match[2]}`
}

export default function Card({ hass, config }: Props) {
  const hasRooms = (config.rooms?.length ?? 0) > 0

  return (
    <ha-card style={{ '--ha-card-border-radius': `${CARD_BORDER_RADIUS_PX}px` } as CSSProperties}>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspectRatio(config.aspect_ratio), borderRadius: CARD_BORDER_RADIUS_PX }}
      >
        {hasRooms ? (
          <Scene hass={hass} config={config} />
        ) : (
          <div className="font-montserrat flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
            <p className="text-sm font-semibold">No rooms yet</p>
            <p className="text-xs opacity-70">Add rooms to the card config to see your floorplan.</p>
          </div>
        )}
      </div>
    </ha-card>
  )
}
