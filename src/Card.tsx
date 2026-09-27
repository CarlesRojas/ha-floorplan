import { aspectRatioCss } from '#/lib/aspect.ts'
import { CARD_CORNER_RADIUS_PX } from '#/theme.ts'
import { useEditorOpen } from '#/lib/editorOpen.ts'
import Scene, { type CameraHandle } from '#/scene/Scene.tsx'
import type { CameraView, CardConfig, HomeAssistant } from '#/types.ts'
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState, type CSSProperties } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

// Whether the camera stands in a view, give or take the rounding a view is
// read with. Standing means no one has orbited away since it landed there.
const VIEW_TOLERANCE_M = 0.02
const sameView = (a: CameraView, b: CameraView) =>
  a.position.every((v, i) => Math.abs(v - b.position[i]) <= VIEW_TOLERANCE_M) &&
  a.target.every((v, i) => Math.abs(v - b.target[i]) <= VIEW_TOLERANCE_M)

export default function Card({ hass, config }: Props) {
  const hasRooms = (config.rooms?.length ?? 0) > 0
  // Hidden under the fullscreen editor, so it holds its last frame.
  const paused = useEditorOpen()
  const camera = useRef<CameraHandle | null>(null)
  // Whether the camera has left the view the card opened with. While it
  // has, a corner button takes it back.
  const [away, setAway] = useState(false)
  // A click on a room's floor takes the camera to the view saved for it. A
  // second click on that floor, with the camera still standing in the view,
  // takes it back to the opening one. A room without a view is a room, and
  // a click on it is nothing.
  const showRoom = (id: string) => {
    const view = config.rooms?.find(r => r.id === id)?.camera
    if (!view || !camera.current) return
    if (sameView(camera.current.view(), view)) camera.current.reset()
    else camera.current.flyTo(view)
  }
  // A click on nothing at all, the air around the home, takes the camera
  // back to the opening view, the way the corner button does.
  const showHome = () => {
    if (away) camera.current?.reset()
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
              onPickNothing={showHome}
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
