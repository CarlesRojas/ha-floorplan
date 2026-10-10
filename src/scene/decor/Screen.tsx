import { useFrame } from '@react-three/fiber'
import { useLive } from '#/scene/live.ts'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'

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
  useLive(true)
  useFrame((_, delta) => {
    if (ref.current) ref.current.uniforms.uTime.value += delta
  })
  return (
    <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={FRAGMENT} toneMapped={false} />
  )
}
