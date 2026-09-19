import Room from '#/scene/Room.tsx'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

const DEFAULT_RADIUS = 0.3
const DEFAULT_GAP = 0.12

export default function Scene({ hass, config }: Props) {
  const rooms = config.rooms ?? []
  const radius = config.radius ?? DEFAULT_RADIUS
  const gap = config.gap ?? DEFAULT_GAP

  const withNames = rooms.map(room => ({
    ...room,
    name: room.name ?? (room.area_id ? hass?.areas?.[room.area_id]?.name : undefined),
  }))

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 40, near: 0.1, far: 200, position: [8, 10, 10] }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <Bounds fit clip observe margin={1.15}>
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
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={2}
        maxDistance={60}
      />
    </Canvas>
  )
}
