import {
  CAMERA_FAR_M,
  CAMERA_FOV_DEG,
  CAMERA_MAX_DISTANCE_M,
  CAMERA_MAX_POLAR_DEG,
  CAMERA_MIN_DISTANCE_M,
  CAMERA_MIN_POLAR_DEG,
  CAMERA_NEAR_M,
} from '#/constants.ts'
import { ROOM_CORNER_RADIUS_M, ROOM_GAP_M } from '#/theme.ts'
import CameraRig, { type CameraHandle } from '#/scene/CameraRig.tsx'
import Cleanup from '#/scene/cleanup.tsx'
import Devices from '#/scene/Devices.tsx'
import PickFallback from '#/scene/pick.tsx'
import Room from '#/scene/Room.tsx'
import Shadows from '#/scene/shadows.tsx'
import SelectionOutline from '#/scene/SelectionOutline.tsx'
import Sky, { type SkyMode } from '#/scene/Sky.tsx'
import type { TryStates } from '#/editor/tryState.ts'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MathUtils, PCFShadowMap } from 'three'
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'

export type { CameraHandle } from '#/scene/CameraRig.tsx'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  // The editor can hold the room at day or at night to see how it looks.
  sky?: SkyMode
  // In the editor, a press in 3D also picks what it landed on, so the plan
  // and the sidebar follow the view.
  onPickDecoration?: (id: string) => void
  onPickRoom?: (id: string) => void
  // A click that lands on nothing at all, which lets go of whatever was
  // picked, the way a click on the plan's empty background does.
  onPickNothing?: () => void
  // What the editor has picked, as `decoration:<id>` or `room:<id>`, drawn
  // with a blue outline. The card never passes one.
  selected?: string | null
  // States the editor tries on pieces with no device. The card passes none.
  tries?: TryStates
  onTry?: (id: string) => void
  // Stops drawing and holds the last frame, for a card nobody can see.
  paused?: boolean
  // Filled with the camera's handle, to read the view or fly to one.
  cameraRef?: RefObject<CameraHandle | null>
}

export default function Scene({
  hass,
  config,
  sky = 'auto',
  onPickDecoration,
  onPickRoom,
  onPickNothing,
  selected,
  tries,
  onTry,
  paused = false,
  cameraRef,
}: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? ROOM_CORNER_RADIUS_M
  const gap = config.gap ?? ROOM_GAP_M
  // When the press fallback last handed a near miss to a piece. Three still
  // sees that same click as landing on nothing, a moment later, and without
  // this it would let go of the piece the fallback had just picked.
  const fallbackAt = useRef(0)
  const markFallback = useCallback(() => {
    fallbackAt.current = performance.now()
  }, [])
  // The rooms are only drawn again when they change, so they are handed a
  // pick that stays the same and calls whatever the editor passed last.
  const latestPickRoom = useRef(onPickRoom)
  useLayoutEffect(() => {
    latestPickRoom.current = onPickRoom
  })
  const pickRoom = useCallback((id: string) => latestPickRoom.current?.(id), [])

  return (
    <Canvas
      // Percentage closer filtering across the map, so the edge comes out
      // soft and clean, and softness comes from how fine the map is. This
      // is what three's soft variant became: since 0.186 that name only
      // warns and falls back to this one.
      shadows={{ type: PCFShadowMap }}
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: CAMERA_FOV_DEG, near: CAMERA_NEAR_M, far: CAMERA_FAR_M }}
      // Three only calls a press missed when it barely moved, so letting go
      // of the camera after orbiting never counts. A right click is left
      // alone, and so is a click the fallback just gave to a piece nearby.
      onPointerMissed={
        onPickNothing &&
        ((e: MouseEvent) => {
          if (e.button !== 0) return
          if (performance.now() - fallbackAt.current < 400) return
          onPickNothing()
        })
      }
    >
      <Sky hass={hass} rooms={rooms} mode={sky} direction={config.sun_direction} />
      {/* Everything solid casts and receives, so a lamp throws the things
          around it onto the floor. */}
      <Shadows />
      <Cleanup />
      <CameraRig rooms={rooms} decorations={config.decorations ?? []} view={config.camera} handle={cameraRef} />
      <Devices hass={hass} config={config} onPick={onPickDecoration} tries={tries} onTry={onTry} />
      {/* A press that misses everything looks around itself for something
          to act on, so small things are still easy to hit. */}
      <PickFallback onHandled={markFallback} />
      {selected && <SelectionOutline target={selected} />}
      {rooms.map((room, i) => (
        <Room key={room.id} room={room} index={i} radius={radius} gap={gap} onPick={onPickRoom && pickRoom} />
      ))}
      <OrbitControls
        makeDefault
        enablePan
        screenSpacePanning={false}
        enableDamping
        dampingFactor={0.1}
        minPolarAngle={MathUtils.degToRad(CAMERA_MIN_POLAR_DEG)}
        maxPolarAngle={MathUtils.degToRad(CAMERA_MAX_POLAR_DEG)}
        minDistance={CAMERA_MIN_DISTANCE_M}
        maxDistance={CAMERA_MAX_DISTANCE_M}
      />
    </Canvas>
  )
}
