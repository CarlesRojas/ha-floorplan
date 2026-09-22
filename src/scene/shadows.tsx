import { LAMP_SHADOW_MAP_PX, MAX_SHADOW_LAMPS } from '#/constants.ts'
import { LAMP_SHADOW_BLUR } from '#/theme.ts'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh, PointLight, type Material } from 'three'

// Every solid thing in the room casts and receives, so a lamp throws the
// chair beside it onto the floor and the floor takes the sun. Models are
// built from many small meshes, so rather than tagging each one the scene is
// swept now and then and anything new is switched on.
//
// Glass and the other see through parts are left out: a pane that cast a
// solid shadow would read as a wall.
//
// The same sweep hands out the lamp shadows. A point light costs six renders
// a frame, so only the brightest few lamps cast, and which ones they are
// follows whatever is switched on.
const CLEAR_ENOUGH = 0.6
const SWEEP_S = 0.5

function clear(material: Material | Material[]) {
  const all = Array.isArray(material) ? material : [material]
  return all.some(m => m.transparent && ((m as { opacity?: number }).opacity ?? 1) < CLEAR_ENOUGH)
}

export default function Shadows() {
  const since = useRef(SWEEP_S)
  useFrame((three, delta) => {
    since.current += delta
    if (since.current < SWEEP_S) return
    since.current = 0
    const lamps: PointLight[] = []
    three.scene.traverse(object => {
      if (object instanceof PointLight) {
        // The light that comes through a shade never casts: that is the
        // whole point of a shade you can see the bulb through.
        if (!object.userData.through) lamps.push(object)
        return
      }
      if (!(object instanceof Mesh)) return
      // A lamp shade is the one thing that is meant to pass light on: its
      // frame casts, the parchment or opal in it does not.
      const solid = !object.userData.transmits && !clear(object.material)
      if (object.castShadow !== solid) object.castShadow = solid
      if (!object.receiveShadow) object.receiveShadow = true
    })
    lamps.sort((a, b) => b.intensity - a.intensity)
    lamps.forEach((lamp, i) => {
      const cast = i < MAX_SHADOW_LAMPS
      if (lamp.castShadow === cast) return
      lamp.castShadow = cast
      if (!cast) return
      lamp.shadow.mapSize.set(LAMP_SHADOW_MAP_PX, LAMP_SHADOW_MAP_PX)
      lamp.shadow.radius = LAMP_SHADOW_BLUR
      lamp.shadow.bias = -0.004
      lamp.shadow.normalBias = 0.03
      lamp.shadow.camera.near = 0.05
      lamp.shadow.camera.far = 8
      lamp.shadow.map?.dispose()
      lamp.shadow.map = null
      lamp.shadow.needsUpdate = true
    })
  })
  return null
}
