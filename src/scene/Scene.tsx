import {
  AMBIENT_LIGHT_INTENSITY,
  CAMERA_FAR_M,
  CAMERA_FIT_MARGIN,
  CAMERA_FOV_DEG,
  CAMERA_MAX_DISTANCE_M,
  CAMERA_MAX_POLAR_DEG,
  CAMERA_MIN_DISTANCE_M,
  CAMERA_MIN_POLAR_DEG,
  CAMERA_NEAR_M,
  CAMERA_START_POSITION_M,
  SUN_LIGHT_INTENSITY,
  SUN_LIGHT_POSITION_M,
} from '#/constants.ts'
import { ROOM_CORNER_RADIUS_M, ROOM_GAP_M } from '#/theme.ts'
import Room from '#/scene/Room.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MathUtils } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Scene({ hass, config }: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? ROOM_CORNER_RADIUS_M
  const gap = config.gap ?? ROOM_GAP_M

  const withNames = rooms.map(room => ({
    ...room,
    name: room.name ?? (room.area_id ? hass?.areas?.[room.area_id]?.name : undefined),
  }))

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: CAMERA_FOV_DEG, near: CAMERA_NEAR_M, far: CAMERA_FAR_M, position: CAMERA_START_POSITION_M }}
    >
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <directionalLight
        position={SUN_LIGHT_POSITION_M}
        intensity={SUN_LIGHT_INTENSITY}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <Bounds fit clip observe margin={CAMERA_FIT_MARGIN}>
        <group>
          {withNames.map((room, i) => (
            <Room key={room.id} room={room} index={i} radius={radius} gap={gap} />
          ))}
        </group>
      </Bounds>
      <OrbitControls
        makeDefault
        enablePan={false}
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
