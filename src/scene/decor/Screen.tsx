import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'

// A screen that is playing. Soft blocks of color drift across it, so a TV or
// a monitor that is on reads as running from across the room, without any
// video to load. The material lights itself, since a picture is not lit by
// the room.

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

void main() {
  vec2 p = vUv;
  float t = uTime * 0.35;
  float a = sin(p.x * 4.0 + t * 1.7) * 0.5 + 0.5;
  float b = sin((p.y + p.x * 0.4) * 5.0 - t * 2.1) * 0.5 + 0.5;
  float c = sin((p.y - p.x) * 3.0 + t * 1.1) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.13, 0.31, 0.58), vec3(0.85, 0.6, 0.36), clamp(a * 0.7 + c * 0.3, 0.0, 1.0));
  col = mix(col, vec3(0.93, 0.96, 1.0), b * 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`

export default function ScreenMaterial() {
  const ref = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((_, delta) => {
    if (ref.current) ref.current.uniforms.uTime.value += delta
  })
  return (
    <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={FRAGMENT} toneMapped={false} />
  )
}
