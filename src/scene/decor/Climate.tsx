import { roundedShape } from '#/geometry/polygon.ts'
import type { Look } from '#/scene/decor/Media.tsx'
import { Led, Material, SEG, Slab, SpinBlur, Spinner, Tube, Waves } from '#/scene/decor/parts.tsx'
import { useMemo, type ReactNode } from 'react'
import { ExtrudeGeometry } from 'three'

// The radiator, the ceiling fan and the floor fan, each in the styles the
// catalog gives it.

// A fan blade seen from above: a long outline tapering from its root to a
// round tip, extruded to its thickness and laid flat, the root at the
// origin and the blade running out along x.
function Blade({
  length,
  root,
  tip,
  thick,
  position,
  rotation,
  children,
}: {
  length: number
  root: number
  tip: number
  thick: number
  position: [number, number, number]
  rotation: [number, number, number]
  children: ReactNode
}) {
  const geometry = useMemo(() => {
    const shape = roundedShape(
      [
        [0, -root / 2],
        [length, -tip / 2],
        [length, tip / 2],
        [0, root / 2],
      ],
      tip * 0.45,
    )
    const g = new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 8 })
    g.rotateX(Math.PI / 2)
    return g
  }, [length, root, tip, thick])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow>
      {children}
    </mesh>
  )
}

// Three radiators, hung `base` off the floor with their pipes running down
// into it. A flat front plate over a convector body, after a Stelrad
// Planar. A run of cast iron columns between round
// headers. A row of flat vertical bars, after the Vasco Niva. All of them
// warm up while they run.
export function Radiator({
  style,
  w,
  h,
  base,
  warm,
  look,
}: {
  style: string
  w: number
  h: number
  base: number
  warm: number
  look: Look
}) {
  const { paint, color, material } = look
  const hot = () => (
    <Material color={color('panel')} material={material('panel')} emissive={[1, 0.45, 0.25]} emissiveIntensity={warm} />
  )
  // The valve end: a pipe up out of the floor, a thermostatic head on it,
  // and a short tail into the radiator. The other end has a plain cap.
  const pipe = (x: number, z: number, head: boolean) => {
    const y = base + 0.05
    return (
      <group key={x}>
        {y > 0.01 && (
          <mesh position={[x, y / 2, z]}>
            <cylinderGeometry args={[0.008, 0.008, y, 12]} />
            {paint('valve')}
          </mesh>
        )}
        <mesh position={[x, y, z]}>
          <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
          {paint('valve')}
        </mesh>
        <mesh position={[(x + (Math.sign(x) * w) / 2) / 2, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, Math.abs(x) - w / 2 + 0.01, 12]} />
          {paint('valve')}
        </mesh>
        {head ? (
          <group position={[x, y + 0.02, z]}>
            <mesh position={[0, 0.035, 0]}>
              <cylinderGeometry args={[0.024, 0.026, 0.07, SEG]} />
              <meshStandardMaterial color="#f2f1ec" roughness={0.6} />
            </mesh>
            {[0.02, 0.035, 0.05].map(k => (
              <mesh key={k} position={[0, k, 0]}>
                <torusGeometry args={[0.025, 0.002, 6, SEG]} />
                <meshStandardMaterial color="#e1dfd8" roughness={0.6} />
              </mesh>
            ))}
          </group>
        ) : (
          <mesh position={[x, y + 0.028, z]}>
            <cylinderGeometry args={[0.012, 0.014, 0.018, 16]} />
            {paint('valve')}
          </mesh>
        )}
      </group>
    )
  }
  if (style === 'column') {
    const sections = Math.max(3, Math.round(w / 0.05))
    const pitch = w / sections
    return (
      <group>
        {Array.from({ length: sections }).flatMap((_, i) =>
          [0.03, 0.06, 0.09].map(z => (
            <group key={`${i}:${z}`} position={[-w / 2 + (i + 0.5) * pitch, base + h / 2, z]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.011, 0.011, h - 0.05, 16]} />
                {hot()}
              </mesh>
              {[-1, 1].map(end => (
                <mesh key={end} position={[0, end * (h / 2 - 0.028), 0]} scale={[1, 1.3, 1]}>
                  <sphereGeometry args={[0.016, 16, 12]} />
                  {hot()}
                </mesh>
              ))}
            </group>
          )),
        )}
        {/* The headers, top and bottom, joining the sections. */}
        {[0.028, h - 0.028].map(y => (
          <mesh key={y} position={[0, base + y, 0.06]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, w - pitch * 0.4, 20]} />
            {hot()}
          </mesh>
        ))}
        {pipe(-w / 2 - 0.035, 0.06, true)}
        {pipe(w / 2 + 0.03, 0.06, false)}
      </group>
    )
  }
  if (style === 'tube') {
    const bars = Math.max(2, Math.floor((w + 0.018) / 0.078))
    const bw = (w - (bars - 1) * 0.018) / bars
    return (
      <group>
        {/* The collectors behind, top and bottom. */}
        {[0.05, h - 0.05].map(y => (
          <mesh key={y} position={[0, base + y, 0.022]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, w - bw * 0.5, 16]} />
            {hot()}
          </mesh>
        ))}
        {Array.from({ length: bars }).map((_, i) => (
          <Slab
            key={i}
            size={[bw, h, 0.024]}
            radius={0.01}
            bevel={0.008}
            position={[-w / 2 + bw / 2 + i * (bw + 0.018), base, 0.048]}
          >
            {hot()}
          </Slab>
        ))}
        {pipe(-w / 2 - 0.035, 0.03, true)}
        {pipe(w / 2 + 0.03, 0.03, false)}
      </group>
    )
  }
  // The flat panel: a smooth front plate standing a shadow gap proud of a
  // darker convector body, a slim grille flush in the top, and the pipes
  // tucked under the right end, with the thermostatic head on the side.
  const slots = Math.max(8, Math.round(w / 0.03))
  const px = w / 2 - 0.07
  return (
    <group position={[0, base, 0]}>
      <Slab size={[w - 0.012, h - 0.012, 0.05]} radius={0.004} position={[0, 0.006, 0.042]}>
        <meshStandardMaterial color="#6f7478" roughness={0.8} metalness={0.2} />
      </Slab>
      <Slab size={[w, h, 0.012]} radius={0.004} bevel={0.002} position={[0, 0, 0.073]}>
        {hot()}
      </Slab>
      <Slab size={[w - 0.004, 0.004, 0.05]} position={[0, h - 0.006, 0.042]}>
        {hot()}
      </Slab>
      {Array.from({ length: slots }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + ((i + 0.5) * w) / slots, h - 0.0015, 0.042]}>
          <boxGeometry args={[(w / slots) * 0.55, 0.002, 0.04]} />
          <meshStandardMaterial color="#2a2c2e" roughness={0.9} />
        </mesh>
      ))}
      {[px - 0.025, px + 0.025].map(x => (
        <group key={x}>
          {base > 0.01 && (
            <mesh position={[x, -base / 2, 0.03]}>
              <cylinderGeometry args={[0.008, 0.008, base, 12]} />
              {paint('valve')}
            </mesh>
          )}
          <mesh position={[x, -0.004, 0.03]}>
            <cylinderGeometry args={[0.012, 0.012, 0.016, 16]} />
            {paint('valve')}
          </mesh>
        </group>
      ))}
      <group position={[w / 2, h - 0.08, 0.042]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.016, 16]} />
          {paint('valve')}
        </mesh>
        <mesh position={[0, 0.047, 0]}>
          <cylinderGeometry args={[0.022, 0.024, 0.062, SEG]} />
          <meshStandardMaterial color="#f2f1ec" roughness={0.6} />
        </mesh>
        {[0.03, 0.045, 0.06].map(k => (
          <mesh key={k} position={[0, k, 0]}>
            <torusGeometry args={[0.023, 0.0018, 6, SEG]} />
            <meshStandardMaterial color="#e1dfd8" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Three ceiling fans. A slim disc of a motor with three long airfoil
// blades, after the Big Ass Fans Haiku. A classic one: a motor housing on
// a downrod, five wooden paddles on metal irons, and a frosted glass bowl
// underneath. A loft one: a small black motor and four long flat blades.
// The drop is down to the underside of the motor, never less than the
// canopy and the motor stacked, so nothing pokes through the ceiling.
export function CeilingFan({
  style,
  r,
  drop: wanted,
  speed,
  look,
}: {
  style: string
  r: number
  drop: number
  speed: number
  look: Look
}) {
  const { paint } = look
  const classic = style === 'classic'
  const loft = style === 'loft'
  const mr = classic ? Math.max(0.09, r * 0.17) : loft ? Math.max(0.06, r * 0.1) : Math.max(0.07, r * 0.17)
  const mh = classic ? Math.max(0.1, r * 0.18) : loft ? Math.max(0.06, r * 0.1) : Math.max(0.045, r * 0.1)
  const canopy = 0.05
  const drop = Math.max(wanted, canopy + mh)
  const rod = drop - canopy - mh
  const blades = classic ? 5 : loft ? 4 : 3
  const blade = (i: number) => {
    if (classic) {
      // An iron from the motor's side out to the paddle, the paddle
      // screwed under it, both pitched.
      const from = mr * 0.9
      return (
        <group key={i} rotation={[0, -(i / blades) * Math.PI * 2, 0]}>
          <mesh position={[from + r * 0.12, mh * 0.3, 0]}>
            <boxGeometry args={[r * 0.26, 0.008, r * 0.07]} />
            {paint('housing')}
          </mesh>
          <Blade
            length={r - from - r * 0.12}
            root={r * 0.22}
            tip={r * 0.26}
            thick={0.01}
            position={[from + r * 0.12, mh * 0.28, 0]}
            rotation={[0.18, 0, 0]}
          >
            {paint('blades')}
          </Blade>
        </group>
      )
    }
    return (
      <group key={i} rotation={[0, -(i / blades) * Math.PI * 2, 0]}>
        <Blade
          length={r - mr * 0.7}
          root={loft ? r * 0.13 : r * 0.22}
          tip={loft ? r * 0.1 : r * 0.1}
          thick={loft ? 0.005 : 0.009}
          position={[mr * 0.7, mh * 0.55, 0]}
          rotation={[loft ? 0.14 : 0.08, 0, 0]}
        >
          {paint('blades')}
        </Blade>
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, -canopy / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, canopy, SEG]} />
        {paint('housing')}
      </mesh>
      {rod > 0.005 && (
        <mesh position={[0, -canopy - rod / 2, 0]}>
          <cylinderGeometry args={[0.013, 0.013, rod + 0.01, 20]} />
          {paint('housing')}
        </mesh>
      )}
      <group position={[0, -drop, 0]}>
        {classic ? (
          <>
            <mesh position={[0, mh / 2, 0]} castShadow>
              <cylinderGeometry args={[mr * 0.7, mr, mh * 0.7, SEG * 2]} />
              {paint('housing')}
            </mesh>
            <mesh position={[0, mh * 0.92, 0]}>
              <cylinderGeometry args={[mr * 0.35, mr * 0.7, mh * 0.2, SEG]} />
              {paint('housing')}
            </mesh>
            {/* The bowl, frosted glass under a metal fitter. */}
            <mesh position={[0, mh * 0.12, 0]}>
              <cylinderGeometry args={[mr * 0.62, mr * 0.62, mh * 0.08, SEG]} />
              {paint('housing')}
            </mesh>
            <mesh position={[0, mh * 0.1, 0]} rotation={[Math.PI, 0, 0]}>
              <sphereGeometry args={[mr * 0.6, SEG, SEG / 2, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {paint('bowl')}
            </mesh>
          </>
        ) : (
          <mesh position={[0, mh / 2, 0]} castShadow>
            <cylinderGeometry args={[mr * (loft ? 0.7 : 0.88), mr, mh, SEG * 2]} />
            {paint('housing')}
          </mesh>
        )}
        <Spinner speed={speed}>{Array.from({ length: blades }, (_, i) => blade(i))}</Spinner>
        <SpinBlur radius={r} inner={mr} speed={speed} color={look.color('blades')} y={mh * 0.4} />
      </group>
    </group>
  )
}

// Two floor fans. A pedestal fan: a weighted round base, a telescopic stem
// up into the motor can, five blades, and a wire cage domed out in front
// and behind, clipped at the rim. The height is the top of the cage, kept
// high enough that the cage clears the floor. A tower fan: a slim oval
// column with the outlet mesh down its front and the controls on top.
export function FloorFan({
  style,
  r,
  h,
  on,
  speed,
  glow,
  look,
}: {
  style: string
  r: number
  h: number
  on: boolean
  speed: number
  glow: number
  look: Look
}) {
  const { paint, color, material } = look
  if (style === 'tower') {
    const foot = 0.044
    return (
      <group>
        <mesh position={[0, foot / 2, 0]} castShadow>
          <cylinderGeometry args={[r * 1.35, r * 1.5, foot, SEG * 2]} />
          {paint('body')}
        </mesh>
        <group scale={[1, 1, 0.62]}>
          <mesh position={[0, (h + foot) / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.78, r, h - foot, SEG * 2]} />
            {paint('body')}
          </mesh>
          {/* The mesh outlet, a tall band just proud of the front, leaning
              in with the taper of the column. */}
          <mesh
            position={[0, h * 0.52, r * (1 - (0.22 * (h * 0.52 - foot)) / (h - foot)) - r * 0.02]}
            rotation={[-Math.atan((r * 0.22) / (h - foot)), 0, 0]}
          >
            <boxGeometry args={[r * 0.9, h * 0.66, r * 0.08]} />
            <Material
              color={color('mesh')}
              material={material('mesh')}
              emissive={[0.6, 0.8, 1]}
              emissiveIntensity={0.7 * glow}
            />
          </mesh>
        </group>
        {/* Control ring on the top. */}
        <mesh position={[0, h + 0.004, 0]} scale={[1, 1, 0.62]}>
          <cylinderGeometry args={[r * 0.4, r * 0.4, 0.008, SEG]} />
          {paint('controls')}
        </mesh>
        <Led on={on} position={[0, h + 0.01, 0]} color="#7fb3e8" radius={Math.min(0.008, r * 0.1)} />
        {/* The draft off the outlet, tall rings spreading out in front. */}
        <Waves
          on={on}
          position={[0, h * 0.52, r * 0.7]}
          from={r * 0.5}
          reach={r * 1.6}
          stretch={[1, (h * 0.66) / r]}
          strength={0.35}
          color="#b8dcff"
        />
      </group>
    )
  }
  const cy = Math.max(h - r, r + 0.12)
  const can = r * 0.55
  const front = r * 0.3
  const rear = -r * 0.25
  // One wire of the cage, from the middle out to the rim.
  const spoke = (a: number, dome: number) =>
    [0, 0.25, 0.5, 0.75, 1].map(
      k => [k * r * Math.cos(a), k * r * Math.sin(a), dome * (1 - k * k)] as [number, number, number],
    )
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[r * 0.72, r * 0.78, 0.04, SEG * 2]} />
        {paint('stand')}
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[r * 0.12, r * 0.3, 0.05, SEG]} />
        {paint('stand')}
      </mesh>
      <mesh position={[0, (cy + 0.08) / 2, 0]}>
        <cylinderGeometry args={[0.016, 0.022, cy - 0.08, 24]} />
        {paint('stand')}
      </mesh>
      {/* The collar where the stem telescopes. */}
      <mesh position={[0, 0.08 + (cy - 0.08) * 0.45, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.04, 24]} />
        {paint('stand')}
      </mesh>
      {/* The head sits forward so the stem rises into the motor can. */}
      <group position={[0, cy, can * 0.6]}>
        <mesh position={[0, 0, -can / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.26, r * 0.3, can, SEG]} />
          {paint('stand')}
        </mesh>
        {/* The blades spin about the forward axis, so their group is
            tipped a quarter turn and the guard stays upright. */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Spinner speed={speed}>
            <mesh>
              <cylinderGeometry args={[r * 0.14, r * 0.14, 0.05, SEG]} />
              {paint('guard')}
            </mesh>
            {Array.from({ length: 5 }).map((_, i) => (
              <mesh
                key={i}
                rotation={[0.35, (i / 5) * Math.PI * 2, 0]}
                position={[Math.cos((i / 5) * Math.PI * 2) * r * 0.45, 0, -Math.sin((i / 5) * Math.PI * 2) * r * 0.45]}
              >
                <boxGeometry args={[r * 0.66, 0.006, r * 0.36]} />
                {paint('blades')}
              </mesh>
            ))}
          </Spinner>
          <SpinBlur radius={r * 0.92} inner={r * 0.14} speed={speed} color={color('blades')} />
        </group>
        {/* The cage: a rim clip, rings and wires on both domes, and a
            badge in the middle of the front. */}
        <mesh>
          <torusGeometry args={[r, 0.008, 10, SEG * 2]} />
          {paint('guard')}
        </mesh>
        {[
          [front, 0.4],
          [front, 0.75],
          [rear, 0.75],
        ].map(([dome, k]) => (
          <mesh key={`${dome}:${k}`} position={[0, 0, dome * (1 - k * k)]}>
            <torusGeometry args={[r * k, 0.004, 8, SEG * 2]} />
            {paint('guard')}
          </mesh>
        ))}
        {[front, rear].flatMap(dome =>
          Array.from({ length: 8 }).map((_, i) => (
            <Tube key={`${dome}:${i}`} points={spoke((i / 8) * Math.PI * 2, dome)} radius={0.003} segments={12}>
              {paint('guard')}
            </Tube>
          )),
        )}
        <mesh position={[0, 0, front]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.14, r * 0.14, 0.008, SEG]} />
          {paint('stand')}
        </mesh>
      </group>
    </group>
  )
}
