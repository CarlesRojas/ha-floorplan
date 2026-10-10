import { useFrame } from '@react-three/fiber'
import { throws, useThrown } from '#/scene/decor/throw.ts'
import { screenTint } from '#/scene/decor/tint.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { useLive } from '#/scene/live.ts'
import { useWarmed } from '#/scene/warm.ts'
import { LAMP_SHADOW_MAP_PX } from '#/constants.ts'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, Vector3, type Mesh, type Object3D, type PointLight, type ShaderMaterial } from 'three'

// A screen that is playing. Soft blocks of changing color glow out of black
// and drift across it, so a TV or a monitor that is on reads as running
// from across the room, without any video to load. The material lights
// itself, since a picture is not lit by the room.

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uLevel;

// A deep, muted color of the given hue, from 0 to 1 round the wheel.
vec3 shade(float h) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return mix(vec3(0.12), k, 0.75) * 0.62;
}

void main() {
  vec2 p = vUv;
  float t = uTime * 0.8;
  float a = sin(p.x * 4.0 + t * 1.7) * 0.5 + 0.5;
  float b = sin((p.y + p.x * 0.4) * 5.0 - t * 2.1) * 0.5 + 0.5;
  float c = sin((p.y - p.x) * 3.0 + t * 1.1) * 0.5 + 0.5;
  // The hue starts on blue green and sways between greens and blues. Once
  // every hundred seconds it goes the whole way round the wheel, through
  // the yellows, oranges, reds and pinks, and back to blue green in half a
  // minute. The blocks drift between the tone of the moment and its
  // neighbor, so there are never more than two colors on it at once.
  float trip = smoothstep(0.7, 1.0, fract(uTime / 100.0));
  float hue = 0.47 + 0.1 * sin(uTime * 0.15) + trip;
  vec3 col = mix(shade(hue), shade(hue + 0.08), clamp(a * 0.6 + c * 0.4, 0.0, 1.0));
  // The colors glow out of a black screen, brightest where the waves overlap.
  float glow = smoothstep(0.0, 0.75, a * 0.45 + c * 0.35 + b * 0.2);
  col = mix(vec3(0.02, 0.02, 0.03), col, glow);
  gl_FragColor = vec4(col, uLevel);
}
`

// `level`, when given, fades the picture in over whatever is behind it, for
// one that is thrown onto a projection screen rather than lit from inside.
export default function ScreenMaterial({ level }: { level?: { current: number } }) {
  const ref = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLevel: { value: 1 } }), [])
  // Only shown while the screen is on, so it plays for as long as it is.
  // On the scene's clock, so the glow round it keeps the same color.
  useLive(true)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.uniforms.uTime.value = clock.elapsedTime
    // Copied each frame, since the material keeps its own copy of the uniforms.
    if (level) ref.current.uniforms.uLevel.value = level.current
  })
  return (
    <shaderMaterial
      ref={ref}
      uniforms={uniforms}
      vertexShader={VERTEX}
      fragmentShader={FRAGMENT}
      toneMapped={false}
      transparent={!!level}
      side={level ? DoubleSide : undefined}
    />
  )
}

/**
 * The light a playing screen throws on the room, in the color on the
 * screen at the moment, so a TV that is on reads from behind it too. It
 * fades in and out with the screen and stays mounted at zero when off,
 * since adding and removing lights recompiles every material in the scene.
 */
export function ScreenGlow({
  on,
  position,
  intensity,
  distance,
}: {
  on: boolean
  position: [number, number, number]
  intensity: number
  distance: number
}) {
  const lit = useEased(on ? 1 : 0, 4)
  const light = useRef<PointLight>(null)
  // Ranked for the shadows by where it is heading, the way a lamp is,
  // and casting from the first frame it is lit. Ranked by its fade, it took
  // a shadow from a lamp already on while it came up, and the shadows of
  // both jumped about.
  const rank = on ? intensity : 0
  const latestRank = useRef(rank)
  useLayoutEffect(() => {
    latestRank.current = rank
  })
  const shown = useWarmed(lit > 0.01, visible => {
    if (!light.current) return
    light.current.visible = visible
    if (visible && latestRank.current > 0) light.current.castShadow = true
  })
  const rgb = useMemo<[number, number, number]>(() => [0, 0, 0], [])
  useLive(on)
  useFrame(({ clock }) => {
    if (!light.current) return
    screenTint(clock.elapsedTime, rgb)
    light.current.color.setRGB(rgb[0], rgb[1], rgb[2])
  })
  return (
    <pointLight
      ref={light}
      position={position}
      intensity={intensity * lit}
      distance={distance}
      decay={1}
      visible={shown}
      userData={{ rank }}
      shadow-mapSize={[LAMP_SHADOW_MAP_PX, LAMP_SHADOW_MAP_PX]}
      shadow-bias={-0.0012}
      shadow-normalBias={0.008}
      shadow-camera-near={0.05}
      shadow-camera-far={distance}
    />
  )
}

// How square on a projector must face a projection screen for its picture
// to land on it, as the cosine of the angle between the two.
const FACING = Math.cos((35 * Math.PI) / 180)

const top = (object: Object3D) => {
  while (object.parent) object = object.parent
  return object
}

/**
 * The picture on a projection screen `w` by `h`, rolled out to `open` of
 * its height: the same colors as a TV that is on, faded in while a
 * projector that is on throws its picture at it. The projector has to face
 * the screen, from either side, near enough square on, and the middle of
 * its throw has to land on the sheet within its reach. Placed in the middle
 * of the sheet as it hangs.
 */
export function Projection({ w, h, open }: { w: number; h: number; open: number }) {
  // Nothing to look for, and no frames to keep coming, while no projector
  // anywhere is on.
  return useThrown() ? <Picture w={w} h={h} open={open} /> : null
}

function Picture({ w, h, open }: { w: number; h: number; open: number }) {
  // A picture never quite fills the sheet, so a little of it shows white
  // all round.
  const edge = Math.min(w, h) * 0.05
  const mesh = useRef<Mesh>(null)
  const level = useRef(0)
  const v = useMemo(
    () => ({
      c: new Vector3(),
      n: new Vector3(),
      x: new Vector3(),
      y: new Vector3(),
      o: new Vector3(),
      d: new Vector3(),
      p: new Vector3(),
    }),
    [],
  )
  useFrame((_, delta) => {
    const m = mesh.current
    const sheet = m?.parent
    if (!m || !sheet) return
    sheet.updateWorldMatrix(true, false)
    sheet.matrixWorld.extractBasis(v.x, v.y, v.n)
    v.x.normalize()
    v.y.normalize()
    v.n.normalize()
    v.c.setFromMatrixPosition(sheet.matrixWorld)
    const home = top(sheet)
    let target = 0
    let side = 1
    for (const t of throws) {
      const o = t.object
      if (!o || top(o) !== home) continue
      o.updateWorldMatrix(true, false)
      v.o.setFromMatrixPosition(o.matrixWorld)
      v.d.setFromMatrixColumn(o.matrixWorld, 2).normalize()
      const facing = v.d.dot(v.n)
      if (Math.abs(facing) < FACING) continue
      const along = v.p.subVectors(v.c, v.o).dot(v.n) / facing
      if (along <= 0 || along > t.length * 1.25) continue
      v.p.copy(v.o).addScaledVector(v.d, along).sub(v.c)
      if (Math.abs(v.p.dot(v.x)) > w * 0.6 || Math.abs(v.p.dot(v.y)) > (h * open) / 2 + h * 0.1) continue
      if (t.strength > target) {
        target = t.strength
        // On the face the light comes from.
        side = facing < 0 ? 1 : -1
      }
    }
    level.current += (target - level.current) * Math.min(1, delta * 4)
    m.visible = level.current > 0.01
    m.position.z = side * 0.003
  })
  return (
    <mesh ref={mesh} scale={[(w - 2 * edge) / w, Math.max(0, h * open - 2 * edge) / h, 1]}>
      <planeGeometry args={[w, h]} />
      <ScreenMaterial level={level} />
    </mesh>
  )
}
