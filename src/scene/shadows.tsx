import { MAX_SHADOW_LAMPS } from '#/constants.ts'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  InstancedMesh,
  Mesh,
  OrthographicCamera,
  PointLight,
  Vector3,
  type DirectionalLight,
  type Light,
  type Material,
  type Object3D,
  type Scene,
} from 'three'

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
const SWEEP_S = 0.25

function clear(material: Material | Material[]) {
  const all = Array.isArray(material) ? material : [material]
  return all.some(m => m.transparent && ((m as { opacity?: number }).opacity ?? 1) < CLEAR_ENOUGH)
}

// A shadow map only changes when something that casts into it moves, turns,
// changes shape, appears or goes, or when the light itself does. Three draws
// every map again on every frame regardless, and the editor's outline draws
// the scene three times a frame, so a room that sat still was paying for a
// few dozen shadow renders a frame. Now each light keeps its map until
// something it can reach has changed. The sun takes any change, a lamp only
// one within its shadow's reach, so a door swinging in the hall leaves the
// bedroom lamps alone. The maps drawn are the same ones as before, only not
// drawn again while nothing in them has moved.

// What a caster was last drawn as: its placement, its geometry and the
// sphere round it, which says which lamps it can reach.
type Caster = {
  frame: number
  matrix: Float64Array
  geometry: number
  version: number
  center: Vector3
  radius: number
}

// What a light's map was last drawn from.
type Lit = { frame: number; shape: Float64Array }

const LIGHT_SHAPE = 40

function watcher(scene: Scene) {
  const casters = new Map<Mesh, Caster>()
  const lights = new Map<Light, Lit>()
  // The spheres that changed this frame, as x, y, z and radius in a row.
  const changed: number[] = []
  const shape = new Float64Array(LIGHT_SHAPE)
  const at = new Vector3()
  let frame = 0
  // Anything changed that a sphere cannot stand for, which every map takes.
  let everywhere = false

  const mark = (c: Caster) => changed.push(c.center.x, c.center.y, c.center.z, c.radius)

  const caster = (mesh: Mesh) => {
    const geometry = mesh.geometry
    const instanced = mesh instanceof InstancedMesh
    const version =
      (geometry.attributes.position?.version ?? 0) + (instanced ? mesh.instanceMatrix.version * 1e6 + mesh.count : 0)
    const m = mesh.matrixWorld.elements
    let c = casters.get(mesh)
    if (c && c.geometry === geometry.id && c.version === version) {
      let same = true
      for (let i = 0; i < 16; i++)
        if (c.matrix[i] !== m[i]) {
          same = false
          break
        }
      if (same) {
        c.frame = frame
        return
      }
    }
    if (c) mark(c)
    else {
      c = { frame, matrix: new Float64Array(16), geometry: -1, version: -1, center: new Vector3(), radius: 0 }
      casters.set(mesh, c)
    }
    if (c.geometry !== geometry.id || c.version !== version || !geometry.boundingSphere)
      geometry.computeBoundingSphere()
    c.frame = frame
    c.matrix.set(m)
    c.geometry = geometry.id
    c.version = version
    c.center.copy(geometry.boundingSphere!.center).applyMatrix4(mesh.matrixWorld)
    c.radius = geometry.boundingSphere!.radius * mesh.matrixWorld.getMaxScaleOnAxis()
    // Copies spread anywhere, so a change to them reaches every light.
    if (instanced) everywhere = true
    mark(c)
  }

  const light = (l: Light) => {
    const shadow = l.shadow!
    shape.fill(0)
    shape.set(l.matrixWorld.elements, 0)
    const target = (l as DirectionalLight).target
    if (target) shape.set(target.matrixWorld.elements, 16)
    const cam = shadow.camera as OrthographicCamera
    shape.set([shadow.mapSize.x, shadow.mapSize.y, cam.near, cam.far, cam.left ?? 0, cam.right ?? 0], 32)
    shape[38] = cam.top ?? 0
    shape[39] = cam.bottom ?? 0
    let seen = lights.get(l)
    let moved = !seen
    if (seen) {
      for (let i = 0; i < LIGHT_SHAPE; i++)
        if (seen.shape[i] !== shape[i]) {
          moved = true
          break
        }
    } else {
      seen = { frame, shape: new Float64Array(LIGHT_SHAPE) }
      lights.set(l, seen)
      shadow.autoUpdate = false
    }
    seen.frame = frame
    if (moved) {
      seen.shape.set(shape)
      shadow.needsUpdate = true
    }
  }

  // Runs once a frame, after three has placed everything and before it draws
  // the maps.
  return () => {
    frame++
    changed.length = 0
    everywhere = false
    scene.traverseVisible((object: Object3D) => {
      if (object instanceof Mesh) {
        if (object.castShadow) caster(object)
      } else if ((object as Light).isLight && object.castShadow && (object as Light).shadow) light(object as Light)
    })
    for (const [mesh, c] of casters)
      if (c.frame !== frame) {
        mark(c)
        casters.delete(mesh)
      }
    for (const [l, seen] of lights) if (seen.frame !== frame) lights.delete(l)
    if (changed.length === 0 && !everywhere) return
    for (const l of lights.keys()) {
      const shadow = l.shadow!
      if (shadow.needsUpdate) continue
      if (everywhere || !(l instanceof PointLight)) {
        shadow.needsUpdate = true
        continue
      }
      l.getWorldPosition(at)
      const reach = shadow.camera.far
      for (let i = 0; i < changed.length; i += 4) {
        const dx = changed[i] - at.x
        const dy = changed[i + 1] - at.y
        const dz = changed[i + 2] - at.z
        const r = reach + changed[i + 3]
        if (dx * dx + dy * dy + dz * dz <= r * r) {
          shadow.needsUpdate = true
          break
        }
      }
    }
  }
}

export default function Shadows() {
  const get = useThree(state => state.get)
  // Armed each frame and spent on the first draw of it. The outline draws
  // the scene again with most of it hidden, which must not read as change.
  const armed = useRef(false)
  useEffect(() => {
    const scene = get().scene
    const check = watcher(scene)
    const before = scene.onBeforeRender
    scene.onBeforeRender = (...args) => {
      before.apply(scene, args)
      if (!armed.current) return
      armed.current = false
      check()
    }
    return () => {
      scene.onBeforeRender = before
      scene.traverse(object => {
        const l = object as Light
        if (l.isLight && l.shadow) l.shadow.autoUpdate = true
      })
    }
  }, [get])

  const since = useRef(SWEEP_S)
  useFrame((three, delta) => {
    armed.current = true
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
    // A lamp asks for its shadow itself, so it casts from the frame it
    // lights up. Six renders each is too much for a room full of them, so
    // the dimmer ones past the budget give theirs up until they are needed.
    lamps.sort((a, b) => b.intensity - a.intensity)
    lamps.forEach((lamp, i) => {
      const cast = i < MAX_SHADOW_LAMPS
      if (lamp.castShadow !== cast) lamp.castShadow = cast
    })
  })
  return null
}
