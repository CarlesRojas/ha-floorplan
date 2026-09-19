import { centroid, ensureCounterClockwise, inset, roundedShape } from '#/geometry/polygon.ts'
import type { RoomConfig } from '#/types.ts'
import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { ExtrudeGeometry } from 'three'

export const SLAB_HEIGHT = 0.08

const PALETTE = ['#7c9cbf', '#c9a27e', '#9bb38a', '#b58fb0', '#d6b56a', '#8fb6b3']

type Props = {
  room: RoomConfig
  index: number
  radius: number
  gap: number
}

export default function Room({ room, index, radius, gap }: Props) {
  const points = useMemo(() => inset(ensureCounterClockwise(room.points), gap / 2), [room.points, gap])
  const label = useMemo(() => centroid(points), [points])

  const geometry = useMemo(() => {
    const shape = roundedShape(points, room.radius ?? radius)
    const geo = new ExtrudeGeometry(shape, {
      depth: SLAB_HEIGHT,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 12,
    })
    // Shape is drawn on the XY plane. Lay it flat so Y is up and plan y maps to -z.
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [points, room.radius, radius])

  const color = room.color ?? PALETTE[index % PALETTE.length]

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <Html position={[label[0], SLAB_HEIGHT + 0.05, -label[1]]} center zIndexRange={[10, 0]}>
        <span className="font-montserrat pointer-events-none text-xs font-semibold whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {room.name ?? room.id}
        </span>
      </Html>
    </group>
  )
}
