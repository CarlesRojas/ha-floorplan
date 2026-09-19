import {
  AMBIENT_LIGHT_INTENSITY,
  CAMERA_FIT_MARGIN,
  CAMERA_FOV,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_POLAR,
  CAMERA_START_POSITION,
  DEFAULT_ROOM_GAP,
  DEFAULT_ROOM_RADIUS,
  SUN_LIGHT_INTENSITY,
  SUN_LIGHT_POSITION,
} from '#/constants.ts'
import Room from '#/scene/Room.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Scene({ hass, config }: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? DEFAULT_ROOM_RADIUS
  const gap = config.gap ?? DEFAULT_ROOM_GAP

  const withNames = rooms.map(room => ({
    ...room,
    name: room.name ?? (room.area_id ? hass?.areas?.[room.area_id]?.name : undefined),
  }))

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 200, position: CAMERA_START_POSITION }}
    >
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <directionalLight
        position={SUN_LIGHT_POSITION}
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
        minPolarAngle={CAMERA_MIN_POLAR}
        maxPolarAngle={CAMERA_MAX_POLAR}
        minDistance={CAMERA_MIN_DISTANCE}
        maxDistance={CAMERA_MAX_DISTANCE}
      />
    </Canvas>
  )
}
