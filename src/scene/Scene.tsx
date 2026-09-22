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
import Sky from '#/scene/Sky.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MathUtils, PCFShadowMap } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Scene({ hass, config }: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? ROOM_CORNER_RADIUS_M
  const gap = config.gap ?? ROOM_GAP_M

  return (
    <Canvas
      // Percentage closer filtering, which is the one shadow map that takes
      // a blur radius, so nothing in the room gets a hard edged shadow.
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: CAMERA_FOV_DEG, near: CAMERA_NEAR_M, far: CAMERA_FAR_M }}
    >
      <Sky hass={hass} />
      {/* Everything solid casts and receives, so a lamp throws the things
          around it onto the floor. */}
      <Shadows />
      <CameraRig rooms={rooms} decorations={config.decorations ?? []} />
      <Devices hass={hass} config={config} />
      {/* A press that misses everything looks around itself for something
          to act on, so small things are still easy to hit. */}
      <PickFallback />
      {rooms.map((room, i) => (
        <Room key={room.id} room={room} index={i} radius={radius} gap={gap} />
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
