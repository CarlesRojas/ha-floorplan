import { useFrame } from '@react-three/fiber'
import { useEased } from '#/scene/decor/ease.ts'
import { useLive } from '#/scene/live.ts'
import { useWarmed } from '#/scene/warm.ts'
import { useMemo, useRef } from 'react'
import type { PointLight, ShaderMaterial } from 'three'

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
  gl_FragColor = vec4(col, 1.0);
}
`

export default function ScreenMaterial() {
  const ref = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  // Only shown while the screen is on, so it plays for as long as it is.
  // On the scene's clock, so the glow round it keeps the same color.
  useLive(true)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={FRAGMENT} toneMapped={false} />
  )
}

// The hue of the screen at a time, the same as the shader's.
function hueAt(time: number) {
  const x = (time / 100) % 1
  const t = Math.min(1, Math.max(0, (x - 0.7) / 0.3))
  return 0.47 + 0.1 * Math.sin(time * 0.15) + t * t * (3 - 2 * t)
}

// The color of a hue at full strength, from 0 to 1 round the wheel.
function vivid(h: number, out: [number, number, number]) {
  for (let i = 0; i < 3; i++) {
    const k = (((h * 6 + [0, 4, 2][i]) % 6) + 6) % 6
    out[i] = Math.min(1, Math.max(0, Math.abs(k - 3) - 1))
  }
  return out
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
  const shown = useWarmed(lit > 0.01, visible => {
    if (light.current) light.current.visible = visible
  })
  const rgb = useMemo<[number, number, number]>(() => [0, 0, 0], [])
  useLive(on)
  useFrame(({ clock }) => {
    if (!light.current) return
    // Between the screen's two colors, washed a touch towards white so the
    // room still reads under it.
    vivid(hueAt(clock.elapsedTime) + 0.04, rgb)
    light.current.color.setRGB(0.1 + 0.9 * rgb[0], 0.1 + 0.9 * rgb[1], 0.1 + 0.9 * rgb[2])
  })
  return (
    <pointLight
      ref={light}
      position={position}
      intensity={intensity * lit}
      distance={distance}
      decay={1}
      visible={shown}
      // A wash of color, not a lamp: it casts nothing, and it is kept out
      // of the shadow sweep, which would rank it by its fade and have the
      // lamps' shadows shuffle while it comes on.
      userData={{ noShadow: true }}
    />
  )
}
