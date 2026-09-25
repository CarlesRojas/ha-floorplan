import { colorValue, decorationVariant, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { Bubbles, FairyLights, Falling, Flames, Spray } from '#/scene/decor/effects.tsx'
import { scatter } from '#/scene/decor/scatter.ts'
import { Glass, Halo, Led, Material, SEG, Slab, Waves } from '#/scene/decor/parts.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Color, Object3D, Vector3, type Group, type InstancedMesh } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

type Look = {
  p: (id: string) => number
  c: (slot: string) => string
  M: (slot: string) => ReactNode
  style: string
  on: boolean
}

type Vec3 = [number, number, number]

// The pieces round the home that show they are on with something alive: a
// fire, a tree's lights, a lit tank of fish, a feeder, a boiler.
export default function HearthModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  const look: Look = {
    p,
    c,
    M: (slot: string) => <Material color={c(slot)} material={m(slot)} />,
    style: decorationVariant(kind, item.variant)?.id ?? '',
    on: state?.on ?? false,
  }
  switch (kind.id) {
    case 'fireplace':
      return look.style === 'stove' ? <Stove {...look} /> : <LinearFire {...look} />
    case 'christmas_tree':
      return <ChristmasTree {...look} />
    case 'aquarium':
      return <Aquarium {...look} />
    case 'pet_feeder':
      return look.style === 'fountain' ? <PetFountain {...look} /> : <PetFeeder {...look} />
    case 'water_heater':
      return look.style === 'tank' ? <TankHeater {...look} /> : <CombiBoiler {...look} />
    default:
      return null
  }
}

// The warm light a fire throws on the floor and the wall round it.
const FIRE_LIGHT = '#ff9a4a'
const SOOT = '#0c0c0d'

// A body `w` wide, `h` tall and `d` deep, standing on its base at `y0`,
// with a firebox let into its front: an opening `ow` by `oh` from `oy` up,
// `depth` deep, lined in soot that glows while the fire burns. The logs and
// flames go in the recess, behind whatever glass closes it.
function Firebox({
  w,
  h,
  d,
  y0,
  ow,
  oh,
  oy,
  depth,
  lit,
  children,
}: {
  w: number
  h: number
  d: number
  y0: number
  ow: number
  oh: number
  oy: number
  depth: number
  lit: number
  children: ReactNode
}) {
  const side = (w - ow) / 2
  const lining = <meshStandardMaterial color={SOOT} emissive={FIRE_LIGHT} emissiveIntensity={0.3 * lit} />
  const inner = d / 2 - depth / 2
  return (
    <group>
      <Slab size={[w, oy - y0, d]} radius={0.006} bevel={0.003} position={[0, y0, 0]}>
        {children}
      </Slab>
      <Slab size={[w, y0 + h - oy - oh, d]} radius={0.006} bevel={0.003} position={[0, oy + oh, 0]}>
        {children}
      </Slab>
      {[-1, 1].map(s => (
        <Slab key={s} size={[side, oh, d]} radius={0.004} bevel={0.002} position={[s * (ow / 2 + side / 2), oy, 0]}>
          {children}
        </Slab>
      ))}
      <Slab size={[ow, oh, d - depth]} radius={0.004} bevel={0.002} position={[0, oy, -depth / 2]}>
        {children}
      </Slab>
      {/* The lining: back, floor, roof and the two cheeks. */}
      <mesh position={[0, oy + oh / 2, d / 2 - depth + 0.001]}>
        <planeGeometry args={[ow, oh]} />
        {lining}
      </mesh>
      <mesh position={[0, oy + 0.001, inner]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ow, depth]} />
        {lining}
      </mesh>
      <mesh position={[0, oy + oh - 0.001, inner]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ow, depth]} />
        {lining}
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * (ow / 2 - 0.001), oy + oh / 2, inner]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[depth, oh]} />
          {lining}
        </mesh>
      ))}
    </group>
  )
}

// A wide gas fire set in a plain black box on a stone hearth, after the
// Faber MatriX: one long ribbon of flame over a bed of pale pebbles behind
// a sheet of glass.
function LinearFire({ p, M, on }: Look) {
  const w = p('width')
  const h = p('height')
  const lit = useEased(on ? 1 : 0, 1.8)
  const plinth = 0.08
  const D = 0.36
  const openW = w - 0.18
  const openH = Math.min(0.42, (h - plinth) * 0.5)
  const openY = plinth + (h - plinth) * 0.28
  const front = D / 2
  // How far the firebox runs back behind the glass.
  const box = D * 0.55
  const stones = Math.max(6, Math.round(openW / 0.07))
  return (
    <group>
      <Slab size={[w + 0.24, plinth, D + 0.26]} radius={0.01} bevel={0.004} position={[0, 0, 0.1]}>
        {M('hearth')}
      </Slab>
      <Firebox w={w} h={h - plinth} d={D} y0={plinth} ow={openW} oh={openH} oy={openY} depth={box} lit={lit}>
        {M('body')}
      </Firebox>
      {Array.from({ length: stones }, (_, i) => (
        <mesh
          key={i}
          position={[-openW / 2 + (openW / stones) * (i + 0.5), openY + 0.014, front - box * 0.45]}
          scale={[1.2 + scatter(i) * 0.5, 0.7, 0.8]}
        >
          <sphereGeometry args={[0.018, 12, 8]} />
          {M('logs')}
        </mesh>
      ))}
      <Flames
        on={on}
        width={openW * 0.92}
        height={openH * 0.75}
        count={Math.round(openW / 0.06)}
        position={[0, openY + 0.02, front - box * 0.45]}
      />
      <mesh position={[0, openY + openH / 2, front - 0.004]}>
        <planeGeometry args={[openW, openH]} />
        <Glass color="#ffffff" opacity={0.08} />
      </mesh>
      <Halo on={on} position={[0, openY + openH / 2, front + 0.35]} color={FIRE_LIGHT} intensity={0.9} distance={3} />
    </group>
  )
}

// A cast iron wood stove on four short legs, its flue going up behind, with
// logs burning behind the glass of its door.
function Stove({ p, c, M, on }: Look) {
  const w = p('width')
  const h = p('height')
  const lit = useEased(on ? 1 : 0, 1.8)
  const legH = 0.12
  const d = w * 0.85
  const bodyH = h - legH
  const doorW = w * 0.72
  const doorH = bodyH * 0.5
  const doorY = legH + bodyH * 0.2
  const front = d / 2
  // How far the firebox runs back behind the door.
  const box = d * 0.7
  const iron = M('body')
  return (
    <group>
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <mesh key={`${sx}${sz}`} position={[(sx * (w - 0.08)) / 2, legH / 2, (sz * (d - 0.08)) / 2]} castShadow>
            <boxGeometry args={[0.04, legH, 0.04]} />
            {iron}
          </mesh>
        )),
      )}
      <Firebox w={w} h={bodyH} d={d} y0={legH} ow={doorW} oh={doorH} oy={doorY} depth={box} lit={lit}>
        {iron}
      </Firebox>
      {/* The top plate, a little proud all round. */}
      <Slab size={[w + 0.03, 0.02, d + 0.03]} radius={0.02} bevel={0.006} position={[0, h - 0.02, 0]}>
        {iron}
      </Slab>
      <mesh position={[0, h + 0.3, -d * 0.1]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.6, SEG]} />
        {iron}
      </mesh>
      {/* Two logs across the grate, well back inside. */}
      {[-1, 1].map(s => (
        <mesh
          key={s}
          position={[0, doorY + 0.03 + (s > 0 ? 0.035 : 0), front - box * 0.5 + s * 0.03]}
          rotation={[0, 0, Math.PI / 2 + s * 0.15]}
        >
          <cylinderGeometry args={[0.022, 0.022, doorW * 0.8, 12]} />
          {M('logs')}
        </mesh>
      ))}
      <Flames
        on={on}
        width={doorW * 0.8}
        height={doorH * 0.6}
        count={9}
        position={[0, doorY + 0.04, front - box * 0.45]}
        sparks
      />
      {/* The door: an iron frame round a clear pane. */}
      <mesh position={[0, doorY + doorH / 2, front + 0.01]}>
        <planeGeometry args={[doorW, doorH]} />
        <Glass color="#ffffff" opacity={0.08} />
      </mesh>
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[0, doorY + doorH / 2 + s * (doorH / 2 + 0.0125), front + 0.01]}>
            <boxGeometry args={[doorW + 0.05, 0.025, 0.02]} />
            {iron}
          </mesh>
          <mesh position={[s * (doorW / 2 + 0.0125), doorY + doorH / 2, front + 0.01]}>
            <boxGeometry args={[0.025, doorH, 0.02]} />
            {iron}
          </mesh>
        </group>
      ))}
      <mesh position={[doorW / 2 + 0.012, doorY + doorH * 0.6, front + 0.03]}>
        <boxGeometry args={[0.018, 0.08, 0.02]} />
        <Material color={c('logs')} material="metal" />
      </mesh>
      <Halo on={on} position={[0, doorY + doorH / 2, front + 0.3]} color={FIRE_LIGHT} intensity={0.7} distance={2.6} />
    </group>
  )
}

// A tree grown the way a real one is: whorls of branches up a trunk, each
// branch with two side shoots, drooping on a fir and reaching up on a
// pencil pine, set round a little from the whorl below and every one a
// slightly different length and shade. Warm white fairy lights are
// scattered over it, thicker lower down where there is more tree, and run
// through their patterns while it is on. It stands in a woven basket, rows
// of rattan round a core with a thick rim at the top.
function ChristmasTree({ p, M, style, on }: Look) {
  const size = p('size')
  const h = p('height')
  const R = size / 2
  const slim = style === 'slim'
  const potH = Math.min(0.24, h * 0.13)
  const basketTop = R * 0.36
  const basketBottom = R * 0.3
  const rows = Math.max(5, Math.round(potH / 0.03))
  const stakes = Math.max(12, Math.round(basketTop * 60))
  const lean = Math.atan2(basketTop - basketBottom, potH)
  // The lowest whorl, a little clear of the pot.
  const y0 = potH + Math.min(0.1, h * 0.05)
  const crown = h - y0
  const branches = useMemo(() => {
    const out: { at: Vec3; dir: Vec3; len: number; wid: number; shade: number }[] = []
    const shoot = (from: Vec3, a: number, lift: number, len: number, wid: number, shade: number) => {
      const dir: Vec3 = [Math.cos(a) * Math.cos(lift), Math.sin(lift), Math.sin(a) * Math.cos(lift)]
      out.push({
        at: [from[0] + (dir[0] * len) / 2, from[1] + (dir[1] * len) / 2, from[2] + (dir[2] * len) / 2],
        dir,
        len,
        wid,
        shade,
      })
      return dir
    }
    const whorls = Math.max(8, Math.round(crown / (slim ? 0.07 : 0.085)))
    for (let k = 0; k < whorls; k++) {
      const t = k / whorls
      const y = y0 + crown * t
      const reach = R * (1 - t) ** (slim ? 0.8 : 1)
      const n = Math.max(3, Math.round((slim ? 5 : 8) * (1 - t * 0.6)))
      for (let j = 0; j < n; j++) {
        const i = k * 16 + j
        const a = (j / n) * Math.PI * 2 + k * 2.4 + (scatter(i, 31) - 0.5) * 0.6
        const len = Math.max(0.05, reach * (0.8 + scatter(i, 32) * 0.3))
        const lift = (slim ? 0.35 : -0.2) + (scatter(i, 33) - 0.5) * 0.25
        const shade = 0.8 + scatter(i, 34) * 0.35
        const dir = shoot([0, y, 0], a, lift, len, len * (slim ? 0.3 : 0.38), shade)
        const fork: Vec3 = [dir[0] * len * 0.5, y + dir[1] * len * 0.5, dir[2] * len * 0.5]
        for (const s of [-1, 1]) shoot(fork, a + s * 0.6, lift - 0.1, len * 0.45, len * 0.2, shade * 0.95)
      }
    }
    // The leader, standing up out of the last whorl.
    shoot([0, h - 0.26, 0], 0, Math.PI / 2, 0.26, 0.05, 1)
    return out
  }, [R, y0, crown, h, slim])
  const bulbs = useMemo(
    () =>
      Array.from({ length: Math.max(30, Math.round(60 * size * h)) }, (_, i): Vec3 => {
        const t = 1 - Math.sqrt(scatter(i, 35)) * 0.97
        const a = scatter(i, 36) * Math.PI * 2
        const r = R * (1 - t) ** (slim ? 0.8 : 1) * (0.72 + scatter(i, 37) * 0.22)
        return [Math.cos(a) * r, y0 + crown * t - (slim ? 0 : r * 0.1), Math.sin(a) * r]
      }),
    [R, y0, crown, size, h, slim],
  )
  const needles = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = needles.current
    if (!m) return
    const o = new Object3D()
    const up = new Vector3(0, 1, 0)
    const v = new Vector3()
    const shade = new Color()
    branches.forEach((b, i) => {
      o.position.set(...b.at)
      o.quaternion.setFromUnitVectors(up, v.set(...b.dir))
      o.scale.set(b.wid, b.len, b.wid)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, shade.setScalar(b.shade))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [branches])
  return (
    <group>
      <mesh position={[0, potH / 2, 0]} castShadow>
        <cylinderGeometry args={[basketTop - 0.008, basketBottom - 0.008, potH, SEG]} />
        {M('stand')}
      </mesh>
      {/* The weave, rows of cane round it, each a little out of line. */}
      {Array.from({ length: rows }, (_, k) => {
        const t = (k + 0.5) / rows
        const r = basketBottom + (basketTop - basketBottom) * t
        return (
          <mesh
            key={k}
            position={[0, t * potH, 0]}
            rotation={[Math.PI / 2 + (scatter(k, 38) - 0.5) * 0.03, 0, k * 0.7]}
            castShadow
          >
            <torusGeometry args={[r, potH / rows / 2, 6, SEG]} />
            {M('stand')}
          </mesh>
        )
      })}
      {/* The canes the rows are woven through, up the outside. */}
      {Array.from({ length: stakes }, (_, k) => {
        const a = (k / stakes) * Math.PI * 2
        const r = (basketTop + basketBottom) / 2 + potH / rows / 2
        return (
          <mesh
            key={k}
            position={[Math.cos(a) * r, potH / 2, Math.sin(a) * r]}
            rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean]}
          >
            <cylinderGeometry args={[0.005, 0.005, potH, 5]} />
            {M('stand')}
          </mesh>
        )
      })}
      <mesh position={[0, potH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[basketTop + 0.004, 0.016, 8, SEG]} />
        {M('stand')}
      </mesh>
      {/* Bark mulch over the top, round the foot of the trunk. */}
      <mesh position={[0, potH - 0.01, 0]}>
        <cylinderGeometry args={[basketTop - 0.01, basketTop - 0.01, 0.01, SEG]} />
        {M('trunk')}
      </mesh>
      {/* The trunk, all the way up into the leader. */}
      <mesh position={[0, (potH + h - 0.2) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.035, h - 0.2 - potH, 10]} />
        {M('trunk')}
      </mesh>
      {/* A dark core, so no light shows through between the branches, and
          narrowing right up to the top whorls so none of them hang loose. */}
      <mesh position={[0, y0 + crown * 0.47, 0]}>
        <coneGeometry args={[R * 0.45, crown * 0.94, 12]} />
        {M('needles')}
      </mesh>
      <instancedMesh key={branches.length} ref={needles} args={[undefined, undefined, branches.length]} castShadow>
        <coneGeometry args={[0.5, 1, 7]} />
        {M('needles')}
      </instancedMesh>
      <FairyLights on={on} points={bulbs} radius={0.011} />
      <Halo on={on} position={[0, y0 + crown * 0.4, R + 0.35]} color="#ffd9a0" intensity={0.25} distance={2.2} />
    </group>
  )
}

// A tank of fish on a cabinet, or a tall one standing on the floor on a low
// plinth, glass all the way up to its height. The light over the water
// comes on with the switch, and so does the air stone, and the fish swim
// either way, if a little slower in the dark.
function Aquarium({ p, M, style, on }: Look) {
  const w = p('width')
  const d = p('depth')
  const h = p('height')
  const lit = useEased(on ? 1 : 0, 3)
  const cabinet = style !== 'floor'
  const baseH = cabinet ? Math.min(0.75, h * 0.56) : 0.08
  const tankH = h - baseH - 0.03
  const water = tankH * 0.9
  const inW = w - 0.02
  const inD = d - 0.02
  const fish = useRef<(Group | null)[]>([])
  const shoal = useMemo(
    () =>
      Array.from({ length: Math.max(4, Math.round(w * (cabinet ? 7 : 14))) }, (_, i) => ({
        speed: 0.25 + scatter(i, 1) * 0.35,
        phase: scatter(i, 2) * Math.PI * 2,
        y: 0.1 + scatter(i, 3) * 0.7,
        depth: 0.2 + scatter(i, 4) * 0.6,
        color: ['#ff8a3d', '#ffd24d', '#4dc3ff', '#ff5d7a', '#b6f06a'][i % 5],
        scale: 0.7 + scatter(i, 5) * 0.6,
      })),
    [w, cabinet],
  )
  const clock = useRef(0)
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.1) * (0.5 + 0.5 * lit)
    const t = clock.current
    shoal.forEach((f, i) => {
      const g = fish.current[i]
      if (!g) return
      const a = t * f.speed + f.phase
      g.position.set(
        Math.sin(a) * inW * 0.4,
        baseH + 0.08 + f.y * (water - 0.14),
        Math.sin(a * 2) * inD * 0.5 * f.depth * 0.5,
      )
      // Heading the way it swims.
      g.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI
    })
  })
  return (
    <group>
      {cabinet ? (
        <>
          <Slab size={[w, baseH, d]} radius={0.01} bevel={0.004}>
            {M('cabinet')}
          </Slab>
          {[-1, 1].map(s => (
            <mesh key={s} position={[(s * w) / 4, baseH * 0.55, d / 2 + 0.003]}>
              <boxGeometry args={[0.01, 0.1, 0.006]} />
              {M('frame')}
            </mesh>
          ))}
          <mesh position={[0, baseH / 2, d / 2 + 0.002]}>
            <boxGeometry args={[0.003, baseH - 0.04, 0.004]} />
            {M('frame')}
          </mesh>
        </>
      ) : (
        <Slab size={[w - 0.02, baseH, d - 0.02]} radius={0.008} bevel={0.003} position={[0, 0, 0]}>
          {M('cabinet')}
        </Slab>
      )}
      <group position={[0, baseH, 0]}>
        {/* The tank's own foot, then the gravel, rocks and plants. */}
        <Slab size={[w, 0.03, d]} radius={0.004} bevel={0.002}>
          {M('frame')}
        </Slab>
        <Slab size={[inW, 0.05, inD]} radius={0.004} bevel={0.002} position={[0, 0.03, 0]}>
          {M('gravel')}
        </Slab>
        {[-0.3, 0.22].map((x, i) => (
          <mesh key={i} position={[x * inW, 0.08, -inD * 0.15]} scale={[1.4, 0.8, 1]}>
            <sphereGeometry args={[Math.min(0.07, tankH * 0.18), 14, 10]} />
            <Material color="#8d877c" material="matte" />
          </mesh>
        ))}
        {Array.from({ length: Math.max(5, Math.round(w * 9)) }, (_, i) => {
          const tall = water * (0.35 + scatter(i, 6) * 0.5)
          return (
            <mesh
              key={i}
              position={[(scatter(i, 7) - 0.5) * inW * 0.9, 0.08 + tall / 2, -inD * (0.1 + scatter(i, 8) * 0.3)]}
              rotation={[0, scatter(i, 9) * 3, (scatter(i, 10) - 0.5) * 0.3]}
            >
              <coneGeometry args={[0.02, tall, 5]} />
              {M('plants')}
            </mesh>
          )
        })}
        <mesh position={[0, 0.03 + water / 2, 0]}>
          <boxGeometry args={[inW, water, inD]} />
          <meshStandardMaterial
            color="#3f8fb5"
            transparent
            opacity={0.3}
            roughness={0.1}
            depthWrite={false}
            emissive="#1f9fe0"
            emissiveIntensity={0.9 * lit}
          />
        </mesh>
        {/* A dark backing on the glass behind, so the water reads. */}
        <mesh position={[0, 0.03 + tankH / 2, -inD / 2 + 0.002]}>
          <planeGeometry args={[inW, tankH]} />
          <meshStandardMaterial color="#14222b" emissive="#0f5d86" emissiveIntensity={0.6 * lit} />
        </mesh>
        <mesh position={[0, 0.03 + tankH / 2, 0]}>
          <boxGeometry args={[w, tankH, d]} />
          <Glass color="#e8f6ff" opacity={0.12} />
        </mesh>
        <Bubbles
          on={on}
          w={0}
          d={0}
          h={water - 0.06}
          count={16}
          at={[[inW * 0.4, -inD * 0.3]]}
          position={[0, 0.08, 0]}
        />
        {/* The lid, and the light strip under it. */}
        <Slab size={[w + 0.004, 0.03, d + 0.004]} radius={0.004} bevel={0.002} position={[0, 0.03 + tankH, 0]}>
          {M('frame')}
        </Slab>
        <mesh position={[0, 0.029 + tankH, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[inW * 0.9, inD * 0.3]} />
          <meshStandardMaterial color="#dfe9ee" emissive="#e8f6ff" emissiveIntensity={2.5 * lit} />
        </mesh>
        <Halo on={on} position={[0, tankH * 0.8, 0]} color="#bfe6ff" intensity={0.35} distance={1.6} />
      </group>
      {shoal.map((f, i) => (
        <group
          key={i}
          ref={el => {
            fish.current[i] = el
          }}
          scale={f.scale}
        >
          <mesh scale={[0.028, 0.013, 0.007]}>
            <sphereGeometry args={[1, 12, 8]} />
            <Material color={f.color} material="ceramic" />
          </mesh>
          <mesh position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 0.012, 0.003]}>
            <coneGeometry args={[1, 1.4, 4]} />
            <Material color={f.color} material="ceramic" />
          </mesh>
        </group>
      ))}
      <Led
        on={on}
        position={[w / 2 - 0.04, cabinet ? baseH - 0.05 : baseH / 2, d / 2 - (cabinet ? -0.004 : 0.006)]}
        radius={0.005}
        color="#8fd6ff"
      />
    </group>
  )
}

// A tower of dry food with a see-through hopper, a chute at its foot and a
// bowl in front. At meal time a portion drops down the chute and the bowl
// fills.
function PetFeeder({ p, c, M, on }: Look) {
  const s = p('size')
  const h = p('height')
  const fill = useEased(on ? 1 : 0, 0.8)
  const towerD = s * 0.8
  const towerZ = -s * 0.35
  const bowlR = s * 0.36
  const bowlZ = towerZ + towerD / 2 + bowlR + 0.01
  const chuteY = 0.1
  const hopperH = h * 0.45
  return (
    <group>
      <Slab size={[s, h - hopperH, towerD]} radius={s * 0.2} bevel={0.01} position={[0, 0, towerZ]}>
        {M('body')}
      </Slab>
      {/* The hopper, clear, with the food in it. */}
      <Slab
        size={[s * 0.9, hopperH * 0.7, towerD * 0.85]}
        radius={s * 0.18}
        bevel={0.005}
        position={[0, h - hopperH + 0.01, towerZ]}
      >
        <Material color={c('food')} material="matte" />
      </Slab>
      <mesh position={[0, h - hopperH / 2, towerZ]}>
        <boxGeometry args={[s * 0.96, hopperH, towerD * 0.94]} />
        <Glass color="#ffffff" opacity={0.25} />
      </mesh>
      <Slab size={[s, 0.03, towerD]} radius={s * 0.2} bevel={0.008} position={[0, h - 0.015, towerZ]}>
        {M('body')}
      </Slab>
      {/* The chute over the bowl. */}
      <mesh position={[0, chuteY + 0.02, towerZ + towerD / 2 + 0.03]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[s * 0.3, 0.02, 0.07]} />
        {M('body')}
      </mesh>
      <mesh position={[0, 0.03, bowlZ]} castShadow>
        <cylinderGeometry args={[bowlR, bowlR * 0.85, 0.06, SEG, 1, true]} />
        <Material color={c('bowl')} material="metal" doubleSide />
      </mesh>
      <mesh position={[0, 0.004, bowlZ]}>
        <cylinderGeometry args={[bowlR * 0.85, bowlR * 0.85, 0.008, SEG]} />
        <Material color={c('bowl')} material="metal" />
      </mesh>
      <mesh position={[0, 0.008 + 0.022 * fill, bowlZ]} scale={[1, Math.max(fill, 0.01), 1]} visible={fill > 0.02}>
        <cylinderGeometry args={[bowlR * 0.8, bowlR * 0.82, 0.045, SEG]} />
        <Material color={c('food')} material="matte" />
      </mesh>
      <Falling
        on={on}
        points={[
          [0, chuteY + 0.01, towerZ + towerD / 2 + 0.07] as Vec3,
          [0.01, chuteY + 0.01, towerZ + towerD / 2 + 0.065] as Vec3,
        ]}
        fall={chuteY - 0.02}
        size={[0.009, 0.009, 0.009]}
        per={4}
        speed={1.4}
        color={c('food')}
        opacity={1}
      />
      <Led on={on} position={[0, h - hopperH - 0.04, towerZ + towerD / 2 + 0.002]} radius={0.006} />
    </group>
  )
}

// A round drinking fountain: water spouts up out of a dome in the middle,
// arcs over and falls back into the bowl round it while the pump is on.
function PetFountain({ p, c, M, on }: Look) {
  const s = p('size')
  const h = Math.min(p('height'), s * 0.8)
  const R = s / 2
  const baseH = h * 0.55
  const flow = useEased(on ? 1 : 0, 3)
  return (
    <group>
      <mesh position={[0, baseH / 2, 0]} castShadow>
        <cylinderGeometry args={[R * 0.92, R, baseH, SEG]} />
        {M('body')}
      </mesh>
      <mesh position={[0, baseH + 0.015, 0]}>
        <cylinderGeometry args={[R * 0.96, R * 0.92, 0.03, SEG, 1, true]} />
        <Material color={c('bowl')} material="ceramic" doubleSide />
      </mesh>
      <mesh position={[0, baseH + 0.012, 0]}>
        <cylinderGeometry args={[R * 0.9, R * 0.9, 0.004, SEG]} />
        <meshStandardMaterial color="#8fc3dc" transparent opacity={0.6} roughness={0.05} />
      </mesh>
      <mesh position={[0, baseH, 0]}>
        <sphereGeometry args={[R * 0.35, SEG, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Material color={c('bowl')} material="ceramic" />
      </mesh>
      {/* The water welling out of the top and sheeting down the dome. */}
      <mesh position={[0, baseH, 0]} visible={flow > 0.01}>
        <sphereGeometry args={[R * 0.37, SEG, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#cfeaf6" transparent opacity={0.6 * flow} roughness={0.02} depthWrite={false} />
      </mesh>
      <mesh position={[0, baseH + R * 0.37, 0]} scale={[1, 0.5 + 0.5 * flow, 1]} visible={flow > 0.01}>
        <sphereGeometry args={[R * 0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e6f5fb" transparent opacity={0.8 * flow} roughness={0.02} depthWrite={false} />
      </mesh>
      {/* The spout: little jets thrown up and out on every side, landing
          on the water past the dome. */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, baseH + 0.012, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <Spray
            on={on}
            reach={R * 0.55}
            apex={R * 0.45}
            from={R * 0.37}
            spread={0.004}
            count={10}
            speed={1.1}
            size={0.004}
            color="#9fd3ec"
          />
        </group>
      ))}
      <Waves
        on={on}
        position={[0, baseH + 0.016, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        from={R * 0.4}
        reach={R * 0.45}
        strength={0.4}
        speed={0.8}
        color="#eef7fc"
      />
      <Led on={on} position={[0, baseH * 0.3, R * 0.97]} radius={0.006} color="#8fd6ff" />
    </group>
  )
}

// A wall hung gas combi boiler: a white case with pipes out of its foot, a
// display on the fascia and a small window onto the burner, where a blue
// flame shows while it heats.
function CombiBoiler({ p, M, on }: Look) {
  const w = p('width')
  const bodyH = w * 1.65
  const d = 0.3
  const lit = useEased(on ? 1 : 0, 4)
  return (
    <group position={[0, -bodyH, 0]}>
      <Slab size={[w, bodyH, d]} radius={0.02} bevel={0.008} position={[0, 0, d / 2]}>
        {M('body')}
      </Slab>
      {/* The fascia along the foot, with its display. */}
      <Slab size={[w - 0.02, 0.1, 0.02]} radius={0.01} bevel={0.004} position={[0, 0.02, d]}>
        {M('trim')}
      </Slab>
      <mesh position={[0, 0.075, d + 0.021]}>
        <planeGeometry args={[w * 0.28, 0.035]} />
        <meshStandardMaterial color="#10171c" emissive="#7fd0ff" emissiveIntensity={1.6 * lit} />
      </mesh>
      {/* The window onto the burner. */}
      <mesh position={[0, bodyH * 0.42, d + 0.001]}>
        <circleGeometry args={[0.035, SEG]} />
        <meshStandardMaterial color={SOOT} emissive="#3d7dff" emissiveIntensity={0.5 * lit} />
      </mesh>
      <Flames
        on={on}
        width={0.05}
        height={0.035}
        count={3}
        position={[0, bodyH * 0.42 - 0.02, d + 0.004]}
        outer="#2a5cff"
        mid="#3d8dff"
        inner="#bfe4ff"
      />
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
        <mesh key={i} position={[x * w, -0.12, d * 0.45]}>
          <cylinderGeometry args={[0.011, 0.011, 0.24, 12]} />
          {M('pipes')}
        </mesh>
      ))}
      <Halo on={on} position={[0, 0.1, d + 0.2]} color="#7fd0ff" intensity={0.08} />
    </group>
  )
}

// A tall round hot water cylinder hung on the wall, with a dial on the
// front whose ring glows while it heats and a gauge down its side that
// climbs as the water warms.
function TankHeater({ p, M, on }: Look) {
  const w = p('width')
  const r = w / 2
  const tall = w * 2.6
  const lit = useEased(on ? 1 : 0, 4)
  const warm = useEased(on ? 1 : 0, 0.25)
  const gauge = tall * 0.5
  return (
    <group position={[0, -tall, r + 0.03]}>
      <mesh position={[0, tall / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, tall - r * 0.6, SEG]} />
        {M('body')}
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, tall / 2 + (s * (tall - r * 0.6)) / 2, 0]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[r, SEG, 16]} />
          {M('body')}
        </mesh>
      ))}
      {/* The dial, and the ring round it. */}
      <mesh position={[0, tall * 0.3, r + 0.004]}>
        <circleGeometry args={[r * 0.24, SEG]} />
        {M('trim')}
      </mesh>
      <mesh position={[0, tall * 0.3, r + 0.006]}>
        <ringGeometry args={[r * 0.26, r * 0.31, SEG]} />
        <meshStandardMaterial color="#3b2a22" emissive="#ff7a3a" emissiveIntensity={2 * lit} />
      </mesh>
      {/* The gauge: a slot, and the warmth rising up it. */}
      <mesh position={[0, tall * 0.42 + gauge / 2, r + 0.003]}>
        <planeGeometry args={[0.018, gauge]} />
        <meshStandardMaterial color="#2a2c2e" />
      </mesh>
      <mesh position={[0, tall * 0.42 + (gauge * warm) / 2, r + 0.005]} scale={[1, Math.max(warm, 0.001), 1]}>
        <planeGeometry args={[0.012, gauge]} />
        <meshStandardMaterial color="#ff8a4a" emissive="#ff6a2a" emissiveIntensity={1.5} />
      </mesh>
      {/* Hot out and cold in, down from its foot. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * r * 0.4, -0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.25, 12]} />
          <Material color={s < 0 ? '#c0503a' : '#3a70c0'} material="metal" />
        </mesh>
      ))}
      <Halo on={on} position={[0, tall * 0.3, r + 0.2]} color="#ff9a5a" intensity={0.1} />
    </group>
  )
}
