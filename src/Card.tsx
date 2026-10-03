import { DEFAULT_ASPECT_RATIO_MOBILE } from '#/constants.ts'
import { aspectRatioCss } from '#/lib/aspect.ts'
import { EDGE_FADE_MASK } from '#/theme.ts'
import { useEditorOpen } from '#/lib/editorOpen.ts'
import Scene, { type CameraHandle } from '#/scene/Scene.tsx'
import type { CameraView, CardConfig, HomeAssistant } from '#/types.ts'
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
  // has, a click on nothing takes it back.
  const [away, setAway] = useState(false)
  // A click on a room's floor takes the camera to the view saved for it. A
  // second click on that floor, with the camera still standing in the view,
  // takes it back to the opening one. A room without a view is a room, and
  // a click on it is nothing.
  //
  // The room flown to stands alone: the rest of the home fades away and
  // takes no presses until the camera heads back.
  const [focus, setFocus] = useState<string | null>(null)
  const viewOf = (id: string) => config.rooms?.find(r => r.id === id)?.camera
  // A room that has left the plan, or lost its view, holds no focus.
  const focused = focus !== null && viewOf(focus) ? focus : null
  const goHome = () => {
    setFocus(null)
    camera.current?.reset()
  }
  const showRoom = (asked: string) => {
    // Around a focused room only that room can be pressed, and the pieces in
    // its walls that were put in the room on the other side. A press on one
    // of those is a press on the room that is showing.
    const id = focused ?? asked
    const view = viewOf(id)
    if (!view || !camera.current) return
    if (sameView(camera.current.view(), view)) goHome()
    else {
      setFocus(id)
      camera.current.flyTo(view)
    }
  }
  // A click on nothing at all, the air around the home or where the faded
  // rooms were, takes the camera back to the opening view.
  const showHome = () => {
    if (away || focused) goHome()
  }
  // With rooms first, which is how the card comes, a click on a device in a
  // room the camera has not flown to goes to that room. A room with no view cannot be flown to, so its
  // devices answer from anywhere.
  const roomFirst = (id: string) => {
    // With a room focused, whatever can be pressed is in it or in its walls.
    if (config.first_click === 'device' || focused || !viewOf(id) || !camera.current) return false
    showRoom(id)
    return true
  }

  const wide = aspectRatioCss(config.aspect_ratio)
  // A card given one shape keeps it at every width. Only a card given none
  // turns square when it is narrow.
  const narrow = aspectRatioCss(config.aspect_ratio_mobile, config.aspect_ratio ? wide : DEFAULT_ASPECT_RATIO_MOBILE)

  return (
    // No background, border or shadow: nothing says where the card ends and
    // the dashboard begins.
    <ha-card style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
      {/* The card's shape follows its own width, not the window's: a card
        in a narrow column on a wide screen is as narrow as one on a phone. */}
      <div className="@container w-full">
        <div
          className="relative aspect-(--aspect) w-full overflow-hidden @max-[600px]:aspect-(--aspect-narrow)"
          style={
            {
              '--aspect': wide,
              '--aspect-narrow': narrow,
            } as CSSProperties
          }
        >
          {hasRooms ? (
            <>
              <div className="absolute inset-0" style={{ mask: EDGE_FADE_MASK, WebkitMask: EDGE_FADE_MASK }}>
                <Scene
                  hass={hass}
                  config={config}
                  paused={paused}
                  cameraRef={camera}
                  onPickRoom={showRoom}
                  onPickNothing={showHome}
                  onCameraAway={value => {
                    setAway(value)
                    if (!value) setFocus(null)
                  }}
                  focus={focused}
                  roomFirst={roomFirst}
                />
              </div>
            </>
          ) : (
            <div className="font-montserrat flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
              <p className="text-sm font-semibold">No rooms yet</p>
              <p className="text-xs opacity-70">Add rooms to the card config to see your floorplan.</p>
            </div>
          )}
        </div>
      </div>
    </ha-card>
  )
}
