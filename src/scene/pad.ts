import { MAX_SHADOW_LAMPS, MAX_SHADOW_LAMPS_TOUCH } from '#/constants.ts'
import { coarseOnly } from '#/scene/device.ts'
import { Group, PointLight, RectAreaLight, type Object3D, type Scene } from 'three'

// Three bakes the count of each kind of light into every shader, so a lamp
// switched on asked for a new shader for every material in the home. Built
// ahead in the background that no longer froze the card, but on a phone the
// lamp still came on a second or two late the first time, and the card
// stuttered while it waited.
//
// So the counts are held to a few steps. The lights that are on are topped
// up with dark ones to the next step, and as many of those cast a shadow as
// it takes to keep the shadows at the budget. A lamp switched on or off then
// mostly lands on the step the scene is already at, with every shader built.
// The steps next to it are built in the background, see `ahead`, so the lamp
// that does cross a step finds its shaders waiting too.
//
// A dark light still costs each pixel its turn of the loop, which is why the
// counts go in steps rather than every lamp staying in the scene for good.
export const POINT_STEP = 4
export const AREA_STEP = 2

type Counts = { point: number; area: number }

type Pads = {
  group: Group
  plain: PointLight[]
  casting: PointLight[]
  area: RectAreaLight[]
  // Lights added on top while the step above is being built.
  extra: Counts
  // The counts the scene was last topped up to, without the extra.
  level: Counts
  budget: number
}

const pads = new WeakMap<Scene, Pads>()

function of(scene: Scene): Pads {
  let p = pads.get(scene)
  if (!p) {
    const group = new Group()
    group.name = 'pads'
    // Far below the home, where they light and shade nothing.
    group.position.set(0, -1000, 0)
    scene.add(group)
    p = {
      group,
      plain: [],
      casting: [],
      area: [],
      extra: { point: 0, area: 0 },
      level: { point: 0, area: 0 },
      budget: coarseOnly() ? MAX_SHADOW_LAMPS_TOUCH : MAX_SHADOW_LAMPS,
    }
    pads.set(scene, p)
  }
  // Something that emptied the scene took the group with it.
  if (p.group.parent !== scene) scene.add(p.group)
  return p
}

// Whether a light is one of the dark ones, which the shadow sweep leaves be.
export const isPad = (object: Object3D) => object.userData.pad === true

const up = (n: number, step: number) => Math.ceil(n / step) * step

type Lights = { point: PointLight[]; area: RectAreaLight[] }

// The lights of the home itself: those on, or with `hidden` all of them.
function collect(object: Object3D, skip: Object3D, hidden: boolean, into: Lights) {
  for (const child of object.children) {
    if (child === skip || (!hidden && !child.visible)) continue
    if (child instanceof PointLight) into.point.push(child)
    else if (child instanceof RectAreaLight) into.area.push(child)
    collect(child, skip, hidden, into)
  }
  return into
}

const rank = (lamp: PointLight): number => lamp.userData.rank ?? lamp.intensity

function fit<T extends Object3D>(p: Pads, list: T[], wanted: number, make: () => T) {
  while (list.length < wanted) {
    const light = make()
    light.userData.pad = true
    p.group.add(light)
    light.updateMatrixWorld(true)
    list.push(light)
  }
  list.forEach((light, i) => {
    light.visible = i < wanted
  })
}

function pointPad(casting: boolean) {
  const light = new PointLight('#000000', 0, 0.1)
  if (casting) {
    light.castShadow = true
    light.shadow.mapSize.set(16, 16)
    light.shadow.camera.far = 1
  }
  return light
}

// Tops the lights up to their step. Called before every draw, ahead of
// three counting the lights, and before shaders are built ahead.
export function balance(scene: Scene) {
  const p = of(scene)
  const on = collect(scene, p.group, false, { point: [], area: [] })
  // A lamp comes on asking for its shadow. Past the budget the dimmest
  // gives its own up here and now, rather than at the next shadow sweep,
  // so the count of shadows never leaves the one the shaders are built for.
  const casters = on.point.filter(lamp => lamp.castShadow)
  if (casters.length > p.budget) {
    casters.sort((a, b) => rank(b) - rank(a))
    for (const lamp of casters.slice(p.budget)) lamp.castShadow = false
  }
  const real = Math.min(casters.length, p.budget)
  p.level.point = on.point.length === 0 ? 0 : up(on.point.length, POINT_STEP) + p.budget
  p.level.area = up(on.area.length, AREA_STEP)
  const point = p.level.point + p.extra.point
  const casting = point === 0 ? 0 : p.budget - real
  fit(p, p.casting, casting, () => pointPad(true))
  fit(p, p.plain, Math.max(0, point - on.point.length - casting), () => pointPad(false))
  fit(p, p.area, p.level.area + p.extra.area - on.area.length, () => new RectAreaLight('#000000', 0, 0.01, 0.01))
}

export type Ahead = { key: string; apply: () => void; revert: () => void }

// A step next to the one the scene is at whose shaders are not built yet,
// if the home has the lamps to reach it: a step of lamps up or down, then a
// step of strips up or down. `apply` puts the scene on it and `revert` takes
// it back, and `key` names it, to tick it off once built.
export function ahead(scene: Scene, built: Set<string>): Ahead | null {
  const p = of(scene)
  const all = collect(scene, p.group, true, { point: [], area: [] })
  const on = collect(scene, p.group, false, { point: [], area: [] })
  const { point, area } = p.level
  built.add(`${point}|${area}`)
  const top = {
    point: all.point.length === 0 ? 0 : up(all.point.length, POINT_STEP) + p.budget,
    area: up(all.area.length, AREA_STEP),
  }
  const first = POINT_STEP + p.budget
  const tries: Counts[] = [
    { point: point === 0 ? first : point + POINT_STEP, area },
    { point: point === first ? 0 : point - POINT_STEP, area },
    { point, area: area + AREA_STEP },
    { point, area: area - AREA_STEP },
  ]
  for (const to of tries) {
    if (to.point < 0 || to.area < 0 || to.point > top.point || to.area > top.area) continue
    const key = `${to.point}|${to.area}`
    if (built.has(key)) continue
    // Up is extra dark lights. Down is the last few lit ones hidden for the
    // moment it takes to ask for the shaders, never for a frame.
    const extra = { point: Math.max(0, to.point - point), area: Math.max(0, to.area - area) }
    const hide: Object3D[] = []
    if (to.point < point) {
      const keep = to.point === 0 ? 0 : to.point - p.budget
      hide.push(...on.point.slice(keep))
    }
    if (to.area < area) hide.push(...on.area.slice(to.area))
    return {
      key,
      apply: () => {
        p.extra = extra
        for (const light of hide) light.visible = false
      },
      revert: () => {
        p.extra = { point: 0, area: 0 }
        for (const light of hide) light.visible = true
      },
    }
  }
  return null
}
