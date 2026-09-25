import { Tube } from '#/scene/decor/parts.tsx'
import type { Vec3 } from '#/scene/decor/points.ts'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { BufferGeometry, Float32BufferAttribute, type Mesh } from 'three'

// A Dutch hood awning, the kind over a shop window: curved ribs that all
// pivot on the same two points at the wall, one at each lower corner, and
// fan out from the wall like the hood of a pram, with the cloth stretched
// over them. Closed, every rib stands folded flat against the wall. Open,
// they fan down to a front rib reaching out a little past level.

// How far the front rib swings out from the wall when fully open.
const OPEN = 1.72
const RIBS = 5
const ACROSS = 32
const ALONG = 40

// A point on a rib, `phi` of the way round it from one pivot to the other,
// before the rib is swung out: `w` across and `rise` high above the pivots.
function rib(phi: number, w: number, rise: number): [number, number] {
  return [(-w / 2) * Math.cos(phi), rise * Math.sin(phi)]
}

export default function HoodAwning({
  w,
  rise,
  out,
  canopy,
  frame,
}: {
  w: number
  rise: number
  out: number
  canopy: ReactNode
  frame: ReactNode
}) {
  const ribPoints = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const [x, y] = rib((Math.PI * i) / 24, w, rise)
        return [x, y, 0.012] as Vec3
      }),
    [w, rise],
  )
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array((ACROSS + 1) * (ALONG + 1) * 3), 3))
    const index: number[] = []
    const at = (i: number, j: number) => j * (ACROSS + 1) + i
    for (let j = 0; j < ALONG; j++) {
      for (let i = 0; i < ACROSS; i++)
        index.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1))
    }
    g.setIndex(index)
    return g
  }, [])
  const swing = OPEN * out
  // The cloth is laid out again whenever the hood moves: each row is
  // swung out its share of the way, and sags in a little between ribs,
  // more the further the ribs have spread apart.
  const mesh = useRef<Mesh>(null)
  useLayoutEffect(() => {
    const cloth = mesh.current?.geometry
    if (!cloth) return
    const position = cloth.attributes.position
    for (let j = 0; j <= ALONG; j++) {
      const v = j / ALONG
      const theta = swing * v
      const between = (v * (RIBS - 1)) % 1
      const sag = 1 - Math.sin(Math.PI * between) * 0.05 * out
      for (let i = 0; i <= ACROSS; i++) {
        const phi = (Math.PI * i) / ACROSS
        const [x, y] = rib(phi, w, rise)
        const r = y * sag
        position.setXYZ(j * (ACROSS + 1) + i, x, r * Math.cos(theta), 0.012 + r * Math.sin(theta))
      }
    }
    position.needsUpdate = true
    cloth.computeVertexNormals()
    cloth.computeBoundingSphere()
  }, [swing, out, w, rise])
  return (
    <group position={[0, -rise, 0]}>
      <mesh ref={mesh} geometry={geometry} castShadow>
        {canopy}
      </mesh>
      {Array.from({ length: RIBS }, (_, i) => (
        <group key={i} rotation={[(swing * i) / (RIBS - 1), 0, 0]}>
          <Tube points={ribPoints} radius={i === RIBS - 1 ? 0.012 : 0.008}>
            {frame}
          </Tube>
        </group>
      ))}
      {/* The two pivots on the wall that every rib turns on. */}
      {[-1, 1].map(sx => (
        <mesh key={sx} position={[(sx * w) / 2, 0, 0.012]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 24]} />
          {frame}
        </mesh>
      ))}
    </group>
  )
}
