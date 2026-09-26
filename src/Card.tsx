import { aspectRatioCss } from '#/lib/aspect.ts'
import { CARD_CORNER_RADIUS_PX } from '#/theme.ts'
import { useEditorOpen } from '#/lib/editorOpen.ts'
import Scene, { type CameraHandle } from '#/scene/Scene.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState, type CSSProperties } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Card({ hass, config }: Props) {
  const hasRooms = (config.rooms?.length ?? 0) > 0
  // Hidden under the fullscreen editor, so it holds its last frame.
  const paused = useEditorOpen()
  const camera = useRef<CameraHandle | null>(null)
  // Whether the camera has left the view the card opened with. While it
  // has, a corner button takes it back.
  const [away, setAway] = useState(false)
  // A click on a room's floor takes the camera to the view saved for it. A
  // room without one is a room, and a click on it is nothing.
  const showRoom = (id: string) => {
    const view = config.rooms?.find(r => r.id === id)?.camera
    if (view) camera.current?.flyTo(view)
  }

  return (
    <ha-card style={{ '--ha-card-border-radius': `${CARD_CORNER_RADIUS_PX}px` } as CSSProperties}>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspectRatioCss(config.aspect_ratio), borderRadius: CARD_CORNER_RADIUS_PX }}
      >
        {hasRooms ? (
          <>
            <Scene
              hass={hass}
              config={config}
              paused={paused}
              cameraRef={camera}
              onPickRoom={showRoom}
              onCameraAway={setAway}
            />
            {away && (
              <button
                type="button"
                aria-label="Back to the opening view"
                title="Back to the opening view"
                onClick={() => camera.current?.reset()}
                className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-(--card-background-color)/80 text-(--primary-text-color) shadow backdrop-blur-sm hover:bg-(--card-background-color)"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="size-4" />
              </button>
            )}
          </>
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
