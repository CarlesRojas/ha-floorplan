import { aspectRatioCss } from '#/lib/aspect.ts'
import { CARD_CORNER_RADIUS_PX } from '#/theme.ts'
import { useEditorOpen } from '#/lib/editorOpen.ts'
import Scene from '#/scene/Scene.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import type { CSSProperties } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Card({ hass, config }: Props) {
  const hasRooms = (config.rooms?.length ?? 0) > 0
  // Hidden under the fullscreen editor, so it holds its last frame.
  const paused = useEditorOpen()

  return (
    <ha-card style={{ '--ha-card-border-radius': `${CARD_CORNER_RADIUS_PX}px` } as CSSProperties}>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspectRatioCss(config.aspect_ratio), borderRadius: CARD_CORNER_RADIUS_PX }}
      >
        {hasRooms ? (
          <Scene hass={hass} config={config} paused={paused} />
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
