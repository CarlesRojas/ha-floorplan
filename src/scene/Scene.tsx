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
import CameraRig from '#/scene/CameraRig.tsx'
import Devices from '#/scene/Devices.tsx'
import PickFallback from '#/scene/pick.tsx'
import Room from '#/scene/Room.tsx'
import Shadows from '#/scene/shadows.tsx'
import Sky, { type SkyMode } from '#/scene/Sky.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MathUtils, PCFSoftShadowMap } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  // The editor can hold the room at day or at night to see how it looks.
  sky?: SkyMode
  // In the editor, a press in 3D also picks what it landed on, so the plan
  // and the sidebar follow the view.
  onPickDecoration?: (id: string) => void
  onPickRoom?: (id: string) => void
}

export default function Scene({ hass, config, sky = 'auto', onPickDecoration, onPickRoom }: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? ROOM_CORNER_RADIUS_M
  const gap = config.gap ?? ROOM_GAP_M

  return (
    <Canvas
      // Soft percentage closer filtering. The plain one takes a blur radius
      // but spreads only a handful of taps to fill it, which at any width
      // worth having reads as dots and dashes along the edge of a shadow.
      // This one filters across the map instead, so the edge comes out soft
      // and clean, and softness comes from how fine the map is.
      shadows={{ type: PCFSoftShadowMap }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: CAMERA_FOV_DEG, near: CAMERA_NEAR_M, far: CAMERA_FAR_M }}
    >
      <Sky hass={hass} rooms={rooms} mode={sky} direction={config.sun_direction} />
      {/* Everything solid casts and receives, so a lamp throws the things
          around it onto the floor. */}
      <Shadows />
      <CameraRig rooms={rooms} decorations={config.decorations ?? []} />
      <Devices hass={hass} config={config} onPick={onPickDecoration} />
      {/* A press that misses everything looks around itself for something
          to act on, so small things are still easy to hit. */}
      <PickFallback />
      {rooms.map((room, i) => (
        <Room key={room.id} room={room} index={i} radius={radius} gap={gap} onPick={onPickRoom} />
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
