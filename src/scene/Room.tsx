import {
  ROOM_LABEL_LIFT,
  ROOM_PALETTE,
  SLAB_BEVEL_SEGMENTS,
  SLAB_BEVEL_SIZE,
  SLAB_BEVEL_THICKNESS,
  SLAB_CURVE_SEGMENTS,
  SLAB_HEIGHT,
} from '#/constants.ts'
import { centroid, ensureCounterClockwise, inset, roundedShape } from '#/geometry/polygon.ts'
import type { RoomConfig } from '#/types.ts'
import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { ExtrudeGeometry } from 'three'

type Props = {
  room: RoomConfig
  index: number
  radius: number
  gap: number
}

export default function Room({ room, index, radius, gap }: Props) {
  // The bevel grows outward from the outline, so inset by it as well to keep
  // the visible edge where the gap says it should be.
  const points = useMemo(
    () => inset(ensureCounterClockwise(room.points), gap / 2 + SLAB_BEVEL_SIZE),
    [room.points, gap],
  )
  const label = useMemo(() => centroid(points), [points])

  const geometry = useMemo(() => {
    const shape = roundedShape(points, room.radius ?? radius)
    const geo = new ExtrudeGeometry(shape, {
      depth: SLAB_HEIGHT,
      bevelEnabled: true,
      bevelThickness: SLAB_BEVEL_THICKNESS,
      bevelSize: SLAB_BEVEL_SIZE,
      bevelSegments: SLAB_BEVEL_SEGMENTS,
      curveSegments: SLAB_CURVE_SEGMENTS,
    })
    // Shape is drawn on the XY plane. Lay it flat so Y is up and plan y maps to -z.
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [points, room.radius, radius])

  const color = room.color ?? ROOM_PALETTE[index % ROOM_PALETTE.length]

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <Html position={[label[0], SLAB_HEIGHT + ROOM_LABEL_LIFT, -label[1]]} center zIndexRange={[10, 0]}>
        <span className="font-montserrat pointer-events-none text-xs font-semibold whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {room.name ?? room.id}
        </span>
      </Html>
    </group>
  )
}
