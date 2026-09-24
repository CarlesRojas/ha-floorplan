import { SOFA_CHAISE_WIDTH, SOFA_DEPTH, SOFA_REACH, SOFA_WIDTH } from '#/scene/decor/sofaSpecs.ts'
import type { Signal } from '#/signals.ts'
import { CEILING_HEIGHT_M, LIGHT_BASE_COLOR, LIGHT_SHADE_COLOR, SCANDI, SCREEN_OFF_COLOR } from '#/theme.ts'

export type Mount = 'floor' | 'wall' | 'ceiling'

export type DecorationParam = {
  id: string
  label: string
  default: number
  min: number
  max: number
  step: number
  // How the editor writes the value. Meters when it is missing.
  unit?: string
  // A two state parameter, stored as 0 or 1 and edited as a switch.
  toggle?: boolean
  // A place in a row of parts, which a button steps through. How many places
  // there are is cycleLength's to say, and the value wraps round it.
  cycle?: boolean
  // A number of parts added to or taken from the count the size gives, which
  // minus and plus buttons step. The editor shows the count that results,
  // which adjustedCount says.
  adjust?: boolean
  // The styles it means something on. Every style when missing.
  variants?: string[]
}

// One style of a kind. A pendant is a pendant whichever one it is, so the
// catalog lists it once and the style is picked in the item's own panel,
// above its sizes. A style that paints different parts brings its own
// slots, which then stand in for the kind's.
export type DecorationVariant = {
  id: string
  label: string
  colors?: Record<string, string>
  materials?: Record<string, string>
  // Its own defaults for some of the kind's parameters. A style drawn after
  // a real piece starts at that piece's real size, and the slider still
  // takes it anywhere from there.
  params?: Record<string, number>
}

export type DecorationKind = {
  id: string
  family: string
  label: string
  mount: Mount
  params: DecorationParam[]
  // Material slots and their default colors.
  colors: Record<string, string>
  // Default surface per slot, matte when missing.
  materials?: Record<string, string>
  // The styles this kind comes in, the first one the default. Absent when
  // there is only one way to draw it.
  variants?: DecorationVariant[]
  // Signals the model can express visually. Anything else can still be
  // bound, the model just does not change.
  expresses: Signal[]
}

// Percentages an item can take, and what each one does to it. Most take a
// single one. A window opens and tilts, so it takes two, and each can be fed
// by a different percentage of the device.
const ITEM_LEVELS: Record<string, { id: string; label: string }[]> = {
  window: [
    { id: 'open', label: 'Open' },
    { id: 'tilt', label: 'Tilt' },
  ],
  blind: [
    { id: 'open', label: 'Open' },
    { id: 'tilt', label: 'Slats' },
  ],
}

export function itemLevels(kind: DecorationKind) {
  return ITEM_LEVELS[kind.id] ?? (kind.expresses.includes('level') ? [{ id: 'open', label: 'Level' }] : [])
}

// Parameter shorthands. Every length is in meters.

// Vertical parameters: how tall something is, or how high it sits. They are
// kept inside a room, a little above the ceiling at most.
const VERTICAL = new Set(['height', 'sill', 'lift', 'drop', 'cord'])
const CEILING_LIMIT_M = 3
const round2 = (value: number) => Math.round(value * 100) / 100

// The range a slider offers. Each one reaches well past the usual size in
// both directions, so nothing is capped just short of a real piece of
// furniture: a wardrobe three meters wide, a coffee table at ankle height.
// Counts, which take whole steps, are left exactly as they are given.

// A slider counts its stops from its own start, so a start that is not a
// whole number of steps puts every stop at an odd value: a bookshelf that
// starts at 23 cm and steps by 5 offers 78, 83, 88. Both ends are pulled
// out to the nearest whole step, which puts the stops on 80, 85, 90.
const down = (value: number, step: number) => round2(Math.floor(value / step + 1e-9) * step)
const up = (value: number, step: number) => round2(Math.ceil(value / step - 1e-9) * step)

const range = (id: string, d: number, min: number, max: number, step: number) => {
  if (step >= 1) return { min, max }
  const low = Math.max(Math.min(min, d * 0.25), VERTICAL.has(id) ? 0 : 0.05)
  const high = Math.max(max, d * 3)
  const top = VERTICAL.has(id) ? Math.min(high, CEILING_LIMIT_M) : high
  return { min: down(low, step), max: up(top, step) }
}

const p = (
  id: string,
  label: string,
  d: number,
  min: number,
  max: number,
  step?: number,
  unit?: string,
): DecorationParam => {
  // A small thing wants a finer step than a wardrobe does: a seven
  // centimeter sensor on a five centimeter step has four places to be.
  const grid = step ?? (d < 0.5 ? 0.01 : 0.05)
  return {
    id,
    label,
    // On a stop of its own slider, so the first drag nudges it by one step
    // rather than jumping it to the nearest round value.
    default: round2(Math.round(d / grid) * grid),
    ...range(id, d, min, max, grid),
    step: grid,
    unit,
  }
}
const width = (d: number, min = 0.3, max = 4) => p('width', 'Width', d, min, max)
const depth = (d: number, min = 0.2, max = 3) => p('depth', 'Depth', d, min, max)
const height = (d: number, min = 0.2, max = 2.6) => p('height', 'Height', d, min, max)
const size = (d: number, min = 0.1, max = 1.5) => p('size', 'Size', d, min, max)
const length = (d: number, min = 0.2, max = 10, step = 0.1) => p('length', 'Length', d, min, max, step)
// Height an item stands at when it is not standing on anything.
const lift = (d: number, max = 1.5) => p('lift', 'Standing on', d, 0, max)
const panels = (d = 2, max = 5) => p('panels', 'Panels', d, 1, max, 1, '')
// How far an appliance is raised off the floor, to sit in a run of units.
const base = (d = 0) => p('base', 'Off floor', d, 0, 1.6)
// Screens are sold by the diagonal, and they are all 16:9.
const inches = (d: number, min = 24, max = 120) => p('inches', 'Screen', d, min, max, 1, '"')
// A switch: off is 0, on is 1.
const flag = (id: string, label: string, d = 0): DecorationParam => ({
  id,
  label,
  default: d,
  min: 0,
  max: 1,
  step: 1,
  unit: '',
  toggle: true,
})

// A place in a row of parts, stepped through with a button rather than a
// slider, since how many places there are depends on the other parameters.
const cycle = (id: string, label: string): DecorationParam => ({
  id,
  label,
  default: 0,
  min: 0,
  max: 99,
  step: 1,
  unit: '',
  cycle: true,
})

// Parts added to or taken from the count the size gives, so the count keeps
// following the size after it is adjusted.
const adjust = (id: string, label: string): DecorationParam => ({
  id,
  label,
  default: 0,
  min: -10,
  max: 10,
  step: 1,
  unit: '',
  adjust: true,
})

// A parameter only some of the kind's styles have.
const only = (param: DecorationParam, variants: string[]): DecorationParam => ({ ...param, variants })

// The parameters the editor shows for a style.
export function styleParams(kind: DecorationKind, variant?: string) {
  const style = decorationVariant(kind, variant)?.id
  return kind.params.filter(p => !p.variants || (style !== undefined && p.variants.includes(style)))
}

// Signal sets.
const NONE: Signal[] = []
const TOGGLE: Signal[] = ['toggle']
const TOGGLE_LEVEL: Signal[] = ['toggle', 'level']
const LIGHT_SIGNALS: Signal[] = ['toggle', 'level', 'color', 'warmth']
const READOUT: Signal[] = ['value', 'enum', 'toggle']

const kind = (
  id: string,
  family: string,
  label: string,
  mount: Mount,
  params: DecorationParam[],
  colors: Record<string, string>,
  materials: Record<string, string>,
  expresses: Signal[] = NONE,
  variants?: DecorationVariant[],
): DecorationKind => ({ id, family, label, mount, params, colors, materials, expresses, variants })

// The pendant's styles are real lamps, so they wear their real finishes:
// natural wood, opal glass, white ceramic, and black canopies and cords.
const PENDANT_BLACK_COLOR = '#232426'
const PENDANT_OPAL_COLOR = '#f6f4ef'
const PENDANT_CERAMIC_COLOR = '#f8f7f4'
const PENDANT_STEEL_COLOR = '#b4b8bb'

// The first style, which is also the kind's own slots.
const PENDANT_NAGOYA: DecorationVariant = {
  id: 'nagoya',
  label: 'Slatted Lantern',
  params: { size: 0.42 },
  colors: { slats: '#e2c89c', threads: '#f2ede4', diffuser: LIGHT_SHADE_COLOR, cord: PENDANT_BLACK_COLOR },
  materials: { slats: 'wood', threads: 'fabric', diffuser: 'matte', cord: 'fabric' },
}

// The table lamp's first style, which is also the kind's own slots, named as
// the lamp before it had styles, so a saved globe or basket color still
// lands on the Cestita.
const TABLE_CESTITA: DecorationVariant = {
  id: 'cestita',
  label: 'Opal Globe Carrier',
  params: { size: 0.22, height: 0.36 },
  colors: { globe: PENDANT_OPAL_COLOR, basket: '#b97a4a' },
  materials: { globe: 'matte', basket: 'wood' },
}

// The floor lamp's first style, which keeps the kind's old slots, so a saved
// shade or stand color still lands on the TMM.
const FLOOR_TMM: DecorationVariant = {
  id: 'tmm',
  label: 'Beech Tripod Drum',
  // 60 by 50 cm across, from the end of a leg to the far side of the shade,
  // and 166 cm tall.
  params: { size: 0.6, depth: 0.5, height: 1.66 },
  colors: { shade: '#ecdfc0', stand: '#dfbb8f', fittings: PENDANT_BLACK_COLOR, cable: PENDANT_BLACK_COLOR },
  materials: { shade: 'fabric', stand: 'wood', fittings: 'metal', cable: 'fabric' },
}

// The dining table's first style, which keeps the kind's old slots and the
// oak on steel it was drawn as before it had styles.
const DINING_VIOK: DecorationVariant = {
  id: 'viok',
  label: 'Oak on Steel Angles',
  // 160 by 90 cm, 76 cm tall.
  params: { width: 1.6, depth: 0.9, height: 0.76 },
  colors: { top: '#dbbf98', frame: '#5a5b5d' },
  materials: { top: 'wood', frame: 'metal' },
}

// The sofa and the pouf, after Pilma's Dresde in its natural fabric, on
// legs painted mocha.
const SOFA_FABRIC_COLOR = '#e4ded4'
const SOFA_LEG_COLOR = '#3d3530'

// The dining chair's first style, which keeps the kind's old shell and
// legs slots, so a saved color still lands on it.
const CHAIR_SLAB: DecorationVariant = {
  id: 'oia',
  label: 'Molded Slab',
  // 48 by 51 cm, 85 cm tall.
  params: { width: 0.48, depth: 0.51, height: 0.85 },
  colors: { shell: '#45403d', legs: '#45403d' },
  materials: { shell: 'matte', legs: 'matte' },
}

// The counter's first style, a run against the wall, which keeps the old
// counter's slots.
const COUNTER_RUN: DecorationVariant = {
  id: 'run',
  label: 'Wall Run',
  colors: { worktop: SCANDI.oak, cabinets: SCANDI.offWhite, fronts: SCANDI.offWhite },
  materials: { worktop: 'wood', cabinets: 'matte', fronts: 'matte' },
}

// The bed's first style, which keeps the old bed's slots.
const BED_HEADBOARD: DecorationVariant = {
  id: 'headboard',
  label: 'Headboard Bed',
  colors: { frame: SCANDI.oak, bedding: SCANDI.offWhite, pillows: SCANDI.linen },
  materials: { frame: 'wood', bedding: 'fabric', pillows: 'fabric' },
}

// The office chair's first style, which keeps the kind's old seat, back,
// frame and base slots, since the old model was a task chair like it.
const OFFICE_TECK: DecorationVariant = {
  id: 'teck',
  label: 'Mesh Task Chair',
  // 66 by 66 cm, 99 cm tall, its seat 49 cm up.
  params: { width: 0.66, depth: 0.66, height: 0.49 },
  colors: { seat: '#252527', back: '#1c1c1e', frame: '#202022', base: '#c9ccd0', castors: '#1b1b1c' },
  materials: { seat: 'fabric', back: 'fabric', frame: 'matte', base: 'metal', castors: 'matte' },
}

// The desk's first style, the kind's old model with its slots.
const DESK_WRITING: DecorationVariant = {
  id: 'writing',
  label: 'Writing desk',
  params: { width: 1.4, depth: 0.7, height: 0.75 },
  colors: { top: SCANDI.oak, legs: SCANDI.oak, drawer: SCANDI.offWhite, handle: SCANDI.slate },
  materials: { top: 'wood', legs: 'wood', drawer: 'matte', handle: 'metal' },
}

// The bench's first style, which keeps the kind's old legs and seat slots.
const BENCH_LAUTA: DecorationVariant = {
  id: 'lauta',
  label: 'Cord Seat Oak Bench',
  // 130 by 42 cm, its seat 44 cm up.
  params: { width: 1.3, depth: 0.42, height: 0.44 },
  colors: { legs: '#e0b584', seat: '#dcc3a0' },
  materials: { legs: 'wood', seat: 'fabric' },
}

// The stool's first style, which keeps the kind's old legs and seat slots.
const STOOL_LAUTA: DecorationVariant = {
  id: 'lauta',
  label: 'Cord Seat Oak',
  // 45 by 35 cm, its seat 68 cm up.
  params: { size: 0.45, depth: 0.35, height: 0.68 },
  colors: { legs: '#e0b584', seat: '#dcc3a0' },
  materials: { legs: 'wood', seat: 'fabric' },
}

// The wall lamp's first style, which keeps the kind's old slots, so a saved
// shade or channel color still lands on the TMM.
const WALL_TMM: DecorationVariant = {
  id: 'tmm',
  label: 'Parchment Wall Drum',
  // A Ø20 shade 23 cm out from the wall, on a channel 20 cm tall.
  params: { size: 0.2, depth: 0.23, tall: 0.2 },
  colors: { shade: '#ecdfc0', channel: '#dfbb8f', fittings: PENDANT_BLACK_COLOR },
  materials: { shade: 'fabric', channel: 'wood', fittings: 'metal' },
}

export const DECORATION_KINDS: DecorationKind[] = [
  // Lights
  kind(
    'light_ceiling',
    'light',
    'Ceiling light',
    'ceiling',
    [size(0.1, 0.06, 0.4)],
    { focus: LIGHT_SHADE_COLOR, rim: LIGHT_BASE_COLOR },
    { focus: 'matte', rim: 'metal' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_pendant',
    'light',
    'Pendant',
    'ceiling',
    // Size is the shade's diameter. Each style starts at its lamp's own.
    [size(0.42, 0.06, 1), p('cord', 'Cord length', 0.8, 0.2, 2)],
    PENDANT_NAGOYA.colors ?? {},
    PENDANT_NAGOYA.materials ?? {},
    LIGHT_SIGNALS,
    // Four Santa & Cole lamps, each drawn from its dimensional drawing.
    [
      PENDANT_NAGOYA,
      {
        id: 'globo_cestita',
        label: 'Opal Lantern',
        params: { size: 0.17 },
        colors: {
          globe: PENDANT_OPAL_COLOR,
          cap: PENDANT_BLACK_COLOR,
          canopy: PENDANT_BLACK_COLOR,
          cord: PENDANT_BLACK_COLOR,
        },
        materials: { globe: 'matte', cap: 'metal', canopy: 'metal', cord: 'fabric' },
      },
      {
        id: 'headhat_bowl',
        label: 'Ceramic Bowl',
        params: { size: 0.2 },
        colors: {
          shade: PENDANT_CERAMIC_COLOR,
          inside: PENDANT_CERAMIC_COLOR,
          capsule: PENDANT_BLACK_COLOR,
          canopy: PENDANT_BLACK_COLOR,
          cord: PENDANT_BLACK_COLOR,
        },
        materials: { shade: 'ceramic', inside: 'matte', capsule: 'metal', canopy: 'metal', cord: 'fabric' },
      },
      {
        id: 'cirio_simple',
        label: 'Porcelain Candle',
        params: { size: 0.1 },
        colors: {
          shade: PENDANT_CERAMIC_COLOR,
          capsule: PENDANT_BLACK_COLOR,
          canopy: PENDANT_BLACK_COLOR,
          cord: PENDANT_BLACK_COLOR,
        },
        materials: { shade: 'ceramic', capsule: 'metal', canopy: 'metal', cord: 'fabric' },
      },
    ],
  ),
  kind(
    'light_floor',
    'light',
    'Floor lamp',
    'floor',
    // Size and depth are the lamp's footprint and height its height. Each
    // style starts at its lamp's own, to the centimeter.
    [
      p('size', 'Width', 0.6, 0.15, 1.0, 0.01),
      p('depth', 'Depth', 0.5, 0.15, 1.0, 0.01),
      p('height', 'Height', 1.66, 0.8, 2.2, 0.01),
    ],
    FLOOR_TMM.colors ?? {},
    FLOOR_TMM.materials ?? {},
    LIGHT_SIGNALS,
    // Three Santa & Cole lamps, each drawn from its dimensional drawing.
    [
      FLOOR_TMM,
      {
        id: 'fad',
        label: 'Adjustable Tripod',
        // Ø49 across the foot and 120 cm at its lowest.
        params: { size: 0.49, depth: 0.49, height: 1.2 },
        colors: { shade: '#f3efe6', stand: '#c08f5e', rod: PENDANT_STEEL_COLOR },
        materials: { shade: 'fabric', stand: 'wood', rod: 'metal' },
      },
      {
        id: 'lamina',
        label: 'Tall Folded Sheet',
        // Ø21 across the base and 187.5 cm to the top of the rod.
        params: { size: 0.21, depth: 0.21, height: 1.88 },
        colors: { shade: '#f5f4f0', back: '#d9dbdc', structure: PENDANT_BLACK_COLOR, diffuser: PENDANT_OPAL_COLOR },
        materials: { shade: 'matte', back: 'metal', structure: 'metal', diffuser: 'matte' },
      },
    ],
  ),
  kind(
    'light_table',
    'light',
    'Table lamp',
    'floor',
    // Size is the lamp's width and height its height. Each style starts at
    // its lamp's own.
    [size(0.22, 0.08, 0.6), height(0.36, 0.15, 0.9), lift(0.75)],
    TABLE_CESTITA.colors ?? {},
    TABLE_CESTITA.materials ?? {},
    LIGHT_SIGNALS,
    // Four Santa & Cole lamps, each drawn from its dimensional drawing.
    [
      TABLE_CESTITA,
      {
        id: 'sylvestrina',
        label: 'Black Glass Candlestick',
        // Ø12.7 by 35.5 cm, to the centimeter.
        params: { size: 0.13, height: 0.36 },
        colors: { base: PENDANT_BLACK_COLOR, glass: '#eef3f4', diffuser: PENDANT_OPAL_COLOR },
        materials: { base: 'ceramic', glass: 'matte', diffuser: 'matte' },
      },
      {
        id: 'maija',
        label: 'Ringed Tripod',
        params: { size: 0.21, height: 0.33 },
        colors: { shade: '#f3f2ee', feet: '#b89a5e', diffuser: PENDANT_OPAL_COLOR },
        materials: { shade: 'matte', feet: 'metal', diffuser: 'matte' },
      },
      {
        id: 'basica_minima',
        label: 'Parchment Drum',
        params: { size: 0.12, height: 0.3 },
        colors: { shade: '#e6d6b4', column: '#e8d3ad', base: '#4b3a2a', stitching: '#5a3b25' },
        materials: { shade: 'fabric', column: 'wood', base: 'metal', stitching: 'fabric' },
      },
    ],
  ),
  kind(
    'light_wall',
    'light',
    'Wall light',
    'wall',
    // Size, depth and lamp height are the lamp's own, out from the wall, and
    // height is how high its middle hangs. Each style starts at its lamp's
    // own size, to the centimeter.
    [
      p('size', 'Width', 0.2, 0.08, 0.6, 0.01),
      p('depth', 'Depth', 0.23, 0.08, 0.5, 0.01),
      p('tall', 'Lamp height', 0.2, 0.08, 0.6, 0.01),
      height(1.8, 0.5, 2.5),
    ],
    WALL_TMM.colors ?? {},
    WALL_TMM.materials ?? {},
    LIGHT_SIGNALS,
    // Three Santa & Cole lamps, each drawn from its dimensional drawing.
    [
      WALL_TMM,
      {
        id: 'singular',
        label: 'Linen Wall Sconce',
        // 18 cm wide, 15 cm out and 30 cm tall.
        params: { size: 0.18, depth: 0.15, tall: 0.3 },
        colors: { shade: '#f4f1ea', structure: '#c9ccce' },
        materials: { shade: 'fabric', structure: 'metal' },
      },
      {
        id: 'wally',
        label: 'Black Arm Opal Globe',
        // A Ø18 globe 22 cm out, on a plate 24 cm tall.
        params: { size: 0.18, depth: 0.22, tall: 0.24 },
        colors: { globe: PENDANT_OPAL_COLOR, structure: PENDANT_BLACK_COLOR },
        materials: { globe: 'matte', structure: 'matte' },
      },
    ],
  ),
  kind(
    'light_strip',
    'light',
    'Floor LED strip',
    'floor',
    [length(1), height(0.02, 0, 2.6)],
    { diffuser: LIGHT_SHADE_COLOR, channel: LIGHT_BASE_COLOR },
    { diffuser: 'matte', channel: 'metal' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_strip_ceiling',
    'light',
    'Ceiling LED strip',
    'ceiling',
    [length(1.6)],
    { diffuser: LIGHT_SHADE_COLOR, channel: LIGHT_BASE_COLOR },
    { diffuser: 'matte', channel: 'metal' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_strip_wall',
    'light',
    'Wall LED strip',
    'wall',
    [length(1.6), height(1.9, 0.1, 2.5)],
    { diffuser: LIGHT_SHADE_COLOR, channel: LIGHT_BASE_COLOR },
    { diffuser: 'matte', channel: 'metal' },
    LIGHT_SIGNALS,
  ),

  // Seating
  kind(
    'sofa',
    'seating',
    'Sofa',
    'floor',
    // The seats share out the width, and a narrow one is an armchair. The
    // chaise's length and side only mean anything on the chaise style.
    [
      width(SOFA_WIDTH, 0.6, 4),
      depth(SOFA_DEPTH, 0.6, 1.3),
      only(p('reach', 'Chaise length', SOFA_REACH, 1.2, 2.2), ['dresde_chaise']),
      only(flag('flip', 'Chaise left'), ['dresde_chaise']),
    ],
    { upholstery: SOFA_FABRIC_COLOR, cushions: SOFA_FABRIC_COLOR, legs: SOFA_LEG_COLOR },
    { upholstery: 'fabric', cushions: 'fabric', legs: 'matte' },
    NONE,
    [
      { id: 'dresde', label: 'Pillow Arm', params: { width: SOFA_WIDTH } },
      { id: 'dresde_chaise', label: 'Pillow Arm Chaise', params: { width: SOFA_CHAISE_WIDTH } },
    ],
  ),
  kind(
    'dining_chair',
    'seating',
    'Dining chair',
    'floor',
    // Each style starts at its chair's own size, to the centimeter, and the
    // sliders scale the chair from there.
    [
      p('width', 'Width', 0.44, 0.35, 0.7, 0.01),
      p('depth', 'Depth', 0.56, 0.35, 0.7, 0.01),
      p('height', 'Height', 0.89, 0.6, 1.1, 0.01),
    ],
    CHAIR_SLAB.colors ?? {},
    CHAIR_SLAB.materials ?? {},
    undefined,
    // Three Pilma chairs, from their stated sizes and product photos.
    [
      CHAIR_SLAB,
      {
        id: 'sura',
        label: 'Cord Seat Teak',
        // 46 by 55 cm, 80 cm tall.
        params: { width: 0.46, depth: 0.55, height: 0.8 },
        colors: { seat: '#c9a57a', frame: '#b98a5c' },
        materials: { seat: 'fabric', frame: 'wood' },
      },
      {
        id: 'varma',
        label: 'Padded Walnut',
        // 48 by 51 cm, 80 cm tall.
        params: { width: 0.48, depth: 0.51, height: 0.8 },
        colors: { seat: '#26272a', frame: '#5b3e30' },
        materials: { seat: 'matte', frame: 'wood' },
      },
    ],
  ),
  kind(
    'office_chair',
    'seating',
    'Office chair',
    'floor',
    // Each style starts at its chair's own size, to the centimeter. Width
    // and depth scale the chair, and the seat height rides the seat up or
    // down on its column as the gas lift does.
    [
      p('width', 'Width', 0.66, 0.4, 0.85, 0.01),
      p('depth', 'Depth', 0.66, 0.4, 0.85, 0.01),
      p('height', 'Seat height', 0.49, 0.38, 0.62, 0.01),
    ],
    OFFICE_TECK.colors ?? {},
    OFFICE_TECK.materials ?? {},
    undefined,
    // One style, a Pilma desk chair, from its stated size and product
    // photos. A saved style that is gone falls back to it.
    [OFFICE_TECK],
  ),
  kind(
    'stool',
    'seating',
    'Stool',
    'floor',
    // Size is the width, so a saved size still sets it, and height is the
    // seat's, which a back scales with. Each style starts at its stool's
    // own, to the centimeter.
    [
      p('size', 'Width', 0.45, 0.25, 0.7, 0.01),
      p('depth', 'Depth', 0.35, 0.25, 0.7, 0.01),
      p('height', 'Seat height', 0.68, 0.3, 0.9, 0.01),
    ],
    STOOL_LAUTA.colors ?? {},
    STOOL_LAUTA.materials ?? {},
    undefined,
    // Three Pilma stools, from their stated sizes and product photos.
    [
      STOOL_LAUTA,
      {
        id: 'dean',
        label: 'Rattan Back Teak',
        // 47 by 51 cm, its seat 65 cm up and its back 90.
        params: { size: 0.47, depth: 0.51, height: 0.65 },
        colors: { legs: '#8b5a36', seat: '#c4a57c' },
        materials: { legs: 'wood', seat: 'fabric' },
      },
      {
        id: 'keula',
        label: 'Horseshoe Back Oak',
        // 45 by 54 cm, its seat 65 cm up.
        params: { size: 0.45, depth: 0.54, height: 0.65 },
        colors: { legs: '#dfb884', seat: '#7d6a62' },
        materials: { legs: 'wood', seat: 'matte' },
      },
    ],
  ),
  kind(
    'bench',
    'seating',
    'Bench',
    'floor',
    // Height is the seat's, which anything set on the bench stands on. Each
    // style starts at its bench's own, to the centimeter.
    [
      p('width', 'Width', 1.3, 0.6, 2.4, 0.01),
      p('depth', 'Depth', 0.42, 0.3, 0.7, 0.01),
      p('height', 'Height', 0.44, 0.35, 0.55, 0.01),
    ],
    BENCH_LAUTA.colors ?? {},
    BENCH_LAUTA.materials ?? {},
    undefined,
    // Two Pilma benches, from their stated sizes and product photos.
    [
      BENCH_LAUTA,
      {
        id: 'angle',
        label: 'Teak with Drawers',
        // 170 by 49 cm, 45 cm tall.
        params: { width: 1.7, depth: 0.49, height: 0.45 },
        colors: { frame: '#a57a4e', drawers: '#5e5b56' },
        materials: { frame: 'wood', drawers: 'matte' },
      },
    ],
  ),
  kind(
    'pouf',
    'seating',
    'Pouf',
    'floor',
    // The sofa's base alone, square, on the sofa's legs.
    [size(0.8, 0.3, 1.2), height(0.42, 0.25, 0.55)],
    { cover: SOFA_FABRIC_COLOR, legs: SOFA_LEG_COLOR },
    { cover: 'fabric', legs: 'matte' },
  ),

  // Tables
  kind(
    'dining_table',
    'table',
    'Dining table',
    'floor',
    // Width is the table's length. Each style starts at its table's own
    // size, to the centimeter.
    [
      p('width', 'Width', 1.6, 0.9, 3, 0.01),
      p('depth', 'Depth', 0.9, 0.7, 1.2, 0.01),
      p('height', 'Height', 0.76, 0.6, 0.85, 0.01),
    ],
    DINING_VIOK.colors ?? {},
    DINING_VIOK.materials ?? {},
    undefined,
    // Three Pilma tables, from their stated sizes and product photos.
    [
      DINING_VIOK,
      {
        id: 'deva',
        label: 'Porcelain in Teak',
        // 180 by 100 cm, 77 cm tall.
        params: { width: 1.8, depth: 1, height: 0.77 },
        colors: { top: '#ddd0ba', frame: '#a9713f' },
        materials: { top: 'ceramic', frame: 'wood' },
      },
      {
        id: 'spider',
        label: 'Crossed Teak Trestles',
        // 200 by 100 cm, 75 cm tall.
        params: { width: 2, depth: 1, height: 0.75 },
        colors: { top: '#9b7e5f', frame: '#87694b' },
        materials: { top: 'wood', frame: 'wood' },
      },
    ],
  ),
  kind(
    'coffee_table',
    'table',
    'Coffee table',
    'floor',
    [width(1.1, 0.6, 1.6), depth(0.6, 0.4, 0.9), height(0.4, 0.3, 0.5)],
    { top: SCANDI.oak, legs: SCANDI.oak, shelf: SCANDI.oak },
    { top: 'wood', legs: 'wood', shelf: 'wood' },
  ),
  kind(
    'side_table',
    'table',
    'Side table',
    'floor',
    [size(0.45, 0.3, 0.7), height(0.5, 0.35, 0.7)],
    { top: SCANDI.oak, legs: SCANDI.oak, shelf: SCANDI.oak },
    { top: 'wood', legs: 'wood', shelf: 'wood' },
  ),
  kind(
    'desk',
    'table',
    'Desk',
    'floor',
    // The ranges cover both styles: the office table goes up far enough to
    // stand at.
    [width(1.4, 0.9, 2.4), depth(0.7, 0.5, 1), height(0.75, 0.65, 1.2)],
    DESK_WRITING.colors ?? {},
    DESK_WRITING.materials ?? {},
    undefined,
    // The office table was a kind of its own, and a saved one is read as a
    // desk in that style.
    [
      DESK_WRITING,
      {
        id: 'office_table',
        label: 'Office table',
        params: { width: 1.6, depth: 0.8, height: 0.75 },
        colors: { top: SCANDI.oak, frame: SCANDI.charcoal, tray: SCANDI.slate },
        materials: { top: 'wood', frame: 'metal', tray: 'metal' },
      },
    ],
  ),
  kind(
    'nightstand',
    'table',
    'Nightstand',
    'floor',
    [width(0.45, 0.3, 0.7), depth(0.4, 0.3, 0.5), height(0.5, 0.35, 0.7)],
    { cabinet: SCANDI.oak, drawers: SCANDI.offWhite, handles: SCANDI.slate },
    { cabinet: 'wood', drawers: 'matte', handles: 'metal' },
  ),

  // Storage
  kind(
    'bookshelf',
    'storage',
    'Bookshelf',
    'floor',
    // The shelves between the bottom and the top follow the height, and a
    // few can be added or taken away.
    [width(0.9, 0.5, 2), depth(0.32, 0.2, 0.5), height(1.8, 0.8, 2.4), adjust('shelves', 'Shelves')],
    { cabinet: SCANDI.oak, shelves: SCANDI.oak },
    { cabinet: 'wood', shelves: 'wood' },
  ),
  kind(
    'sideboard',
    'storage',
    'Sideboard',
    'floor',
    [width(1.6, 0.9, 2.6), depth(0.42, 0.3, 0.6), height(0.75, 0.6, 1)],
    { cabinet: SCANDI.oak, fronts: SCANDI.offWhite, handles: SCANDI.slate },
    { cabinet: 'wood', fronts: 'matte', handles: 'metal' },
  ),
  kind(
    'wardrobe',
    'storage',
    'Wardrobe',
    'floor',
    [width(1.2, 0.6, 2.6), depth(0.6, 0.45, 0.75), height(2.1, 1.6, 2.5)],
    { cabinet: SCANDI.offWhite, fronts: SCANDI.oak, handles: SCANDI.slate },
    { cabinet: 'matte', fronts: 'wood', handles: 'metal' },
  ),
  kind(
    'dresser',
    'storage',
    'Dresser',
    'floor',
    [width(1, 0.6, 1.8), depth(0.45, 0.35, 0.6), height(0.9, 0.6, 1.3)],
    { cabinet: SCANDI.oak, fronts: SCANDI.offWhite, handles: SCANDI.slate },
    { cabinet: 'wood', fronts: 'matte', handles: 'metal' },
  ),
  kind(
    'shoe_rack',
    'storage',
    'Shoe rack',
    'floor',
    [width(0.8, 0.5, 1.4), depth(0.3, 0.2, 0.4), height(0.5, 0.3, 0.9)],
    { frame: SCANDI.oak, rails: SCANDI.oak },
    { frame: 'wood', rails: 'wood' },
  ),
  kind(
    'wall_shelf',
    'storage',
    'Wall shelf',
    'wall',
    [width(0.9, 0.4, 1.8), depth(0.24, 0.15, 0.4), height(1.5, 0.6, 2.3)],
    { shelf: SCANDI.oak },
    { shelf: 'wood' },
  ),

  // Bedroom
  kind(
    'bed_double',
    'bed',
    'Bed',
    'floor',
    [width(1.6, 0.9, 2), length(2.05, 1.8, 2.3, 0.05)],
    BED_HEADBOARD.colors ?? {},
    BED_HEADBOARD.materials ?? {},
    undefined,
    // The platform bed is the same bed with no board at its head, for one
    // pushed against the wall.
    [BED_HEADBOARD, { ...BED_HEADBOARD, id: 'platform', label: 'Platform Bed' }],
  ),

  // Kitchen
  kind(
    'kitchen_counter',
    'kitchen',
    'Counter',
    'floor',
    // A run of 60 cm base units and one that takes up the rest of the
    // width. By default that one grows from nothing to a full unit. The wide
    // switch has it grow from one unit to just short of two instead, so no
    // unit is ever narrower than a full one. The growing unit can stand at
    // any place in the run.
    [
      width(1.8, 0.6, 4),
      depth(0.62, 0.5, 1.2),
      height(0.9, 0.8, 1.1),
      flag('wide', 'Wide module'),
      cycle('grow', 'Growing module'),
    ],
    COUNTER_RUN.colors ?? {},
    COUNTER_RUN.materials ?? {},
    undefined,
    [
      COUNTER_RUN,
      {
        id: 'island',
        label: 'Island',
        // Deeper, with the worktop overhanging at the back for stools.
        params: { depth: 0.9, height: 0.92 },
        colors: { worktop: SCANDI.oak, cabinets: SCANDI.sage, fronts: SCANDI.sage },
      },
    ],
  ),
  kind(
    'upper_cabinets',
    'kitchen',
    'Upper cabinets',
    'wall',
    // Built from 60 cm units the way the counter is, with the same wide
    // switch and growing unit, so a run of them can line up over one.
    [
      width(1.8, 0.6, 4),
      depth(0.35, 0.25, 0.45),
      height(1.5, 1.2, 2),
      flag('wide', 'Wide module'),
      cycle('grow', 'Growing module'),
    ],
    { cabinets: SCANDI.offWhite, doors: SCANDI.offWhite, handles: SCANDI.slate },
    { cabinets: 'matte', doors: 'matte', handles: 'metal' },
  ),
  kind(
    'fridge',
    'kitchen',
    'Fridge',
    'floor',
    [width(0.6, 0.5, 0.95), depth(0.66, 0.5, 0.8), height(2.03, 0.8, 2.1), base()],
    { body: SCANDI.offWhite, doors: SCANDI.offWhite, handles: SCANDI.slate },
    { body: 'ceramic', doors: 'ceramic', handles: 'metal' },
    TOGGLE,
  ),
  kind(
    'oven',
    'kitchen',
    'Oven',
    'floor',
    [width(0.6, 0.45, 0.9), depth(0.55, 0.5, 0.7), height(0.6, 0.45, 0.9), base()],
    { body: '#34383b', glass: '#111416', handle: '#b9bdbf', display: '#16191b' },
    { body: 'ceramic', glass: 'ceramic', handle: 'metal', display: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'hob',
    'kitchen',
    'Hob',
    'floor',
    [width(0.6, 0.4, 0.9), depth(0.52, 0.4, 0.7), lift(0.9)],
    { glass: SCANDI.charcoal, zones: '#6c7175' },
    { glass: 'ceramic', zones: 'metal' },
    TOGGLE,
  ),
  kind(
    'extractor_hood',
    'kitchen',
    'Extractor hood',
    'ceiling',
    [width(0.7, 0.5, 1.2), depth(0.45, 0.35, 0.6)],
    { canopy: SCANDI.offWhite, chimney: SCANDI.slate, filter: SCANDI.slate, controls: SCANDI.slate },
    { canopy: 'metal', chimney: 'metal', filter: 'metal', controls: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'ceiling_extractor',
    'kitchen',
    'Ceiling extractor',
    'ceiling',
    [width(0.9, 0.6, 1.4), depth(0.5, 0.35, 0.9)],
    { panel: SCANDI.offWhite, grille: SCANDI.slate },
    { panel: 'matte', grille: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'dishwasher',
    'kitchen',
    'Dishwasher',
    'floor',
    [width(0.6, 0.45, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 0.95), base()],
    { body: SCANDI.offWhite, door: SCANDI.offWhite, glass: '#3c4144', handle: SCANDI.slate, knobs: SCANDI.slate },
    { body: 'ceramic', door: 'ceramic', glass: 'ceramic', handle: 'metal', knobs: 'metal' },
    TOGGLE,
  ),
  kind(
    'kitchen_sink',
    'kitchen',
    'Sink',
    'floor',
    [width(0.55, 0.4, 0.9), depth(0.45, 0.35, 0.6), lift(0.9)],
    { bowl: SCANDI.slate, tap: SCANDI.slate },
    { bowl: 'metal', tap: 'metal' },
  ),
  kind(
    'microwave',
    'kitchen',
    'Microwave',
    'floor',
    [width(0.44, 0.35, 0.7), depth(0.35, 0.3, 0.5), height(0.26, 0.2, 0.45), lift(1.2)],
    { body: '#c4c7c8', door: '#1c1f21', glass: '#111416', knobs: '#8f9497' },
    { body: 'metal', door: 'ceramic', glass: 'ceramic', knobs: 'metal' },
    TOGGLE,
  ),
  kind(
    'coffee_machine',
    'kitchen',
    'Coffee machine',
    'floor',
    [size(0.22, 0.15, 0.35), height(0.34, 0.25, 0.5), lift(0.92)],
    { body: SCANDI.charcoal, fittings: SCANDI.oak },
    { body: 'matte', fittings: 'wood' },
    TOGGLE,
  ),
  kind(
    'kettle',
    'kitchen',
    'Kettle',
    'floor',
    [size(0.16, 0.1, 0.25), lift(0.92)],
    { body: SCANDI.offWhite, fittings: SCANDI.oak },
    { body: 'ceramic', fittings: 'wood' },
    TOGGLE,
  ),

  // Laundry
  kind(
    'washing_machine',
    'laundry',
    'Washing machine',
    'floor',
    [width(0.6, 0.5, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 1), base()],
    { body: SCANDI.offWhite, door: SCANDI.slate, controls: SCANDI.slate },
    { body: 'ceramic', door: 'metal', controls: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'dryer',
    'laundry',
    'Dryer',
    'floor',
    [width(0.6, 0.5, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 1), base()],
    { body: SCANDI.offWhite, door: SCANDI.slate, controls: SCANDI.slate },
    { body: 'ceramic', door: 'metal', controls: 'metal' },
    TOGGLE_LEVEL,
  ),

  // Bathroom
  kind(
    'toilet',
    'bathroom',
    'Toilet',
    'floor',
    [width(0.38, 0.3, 0.5), depth(0.68, 0.5, 0.85)],
    { pan: SCANDI.offWhite, seat: SCANDI.oak, flush: SCANDI.slate },
    { pan: 'ceramic', seat: 'wood', flush: 'metal' },
  ),
  kind(
    'basin',
    'bathroom',
    'Basin',
    'floor',
    [width(0.6, 0.4, 1.2), depth(0.45, 0.35, 0.6), height(0.85, 0.7, 0.95)],
    { bowl: SCANDI.offWhite, vanity: SCANDI.oak, tap: SCANDI.slate, handle: SCANDI.slate },
    { bowl: 'ceramic', vanity: 'wood', tap: 'metal', handle: 'metal' },
  ),
  kind(
    'bathtub',
    'bathroom',
    'Bathtub',
    'floor',
    [width(0.78, 0.6, 1), length(1.7, 1.3, 2, 0.05)],
    { tub: SCANDI.offWhite, plinth: SCANDI.slate, tap: SCANDI.slate },
    { tub: 'ceramic', plinth: 'metal', tap: 'metal' },
  ),
  kind(
    'shower',
    'bathroom',
    'Shower',
    'floor',
    [
      width(0.9, 0.7, 1.8),
      depth(0.9, 0.7, 1.8),
      height(2, 1.8, 2.3),
      p('glass', 'Glass sides', 2, 0, 3, 1, ''),
      flag('flip', 'Glass on the right'),
    ],
    { tray: SCANDI.offWhite, glass: '#dbe6e9', frame: SCANDI.slate, tap: SCANDI.slate },
    { tray: 'ceramic', glass: 'ceramic', frame: 'metal', tap: 'metal' },
  ),
  kind(
    'towel_rail',
    'bathroom',
    'Towel rail',
    'wall',
    [width(0.6, 0.3, 1), height(1.2, 0.6, 1.8)],
    { rail: SCANDI.slate, towel: SCANDI.linen },
    { rail: 'metal', towel: 'fabric' },
    TOGGLE,
  ),

  // Decor
  kind(
    'half_wall',
    'decor',
    'Half wall',
    'floor',
    [width(2, 0.4, 8), depth(0.2, 0.1, 0.4), height(1, 0.4, 1.6)],
    { wall: SCANDI.offWhite },
    { wall: 'matte' },
  ),
  kind(
    'rug',
    'decor',
    'Rug',
    'floor',
    [width(2, 0.6, 4), depth(1.4, 0.5, 3)],
    { field: SCANDI.linen, border: SCANDI.clay },
    { field: 'carpet', border: 'carpet' },
  ),
  kind(
    'plant_large',
    'decor',
    'Floor plant',
    'floor',
    [size(0.8, 0.3, 1.6), height(1.6, 0.6, 2.4)],
    { pot: SCANDI.offWhite, soil: '#3c332b', stems: '#7a6a58', leaves: '#4f7d3c' },
    { pot: 'ceramic', soil: 'matte', stems: 'wood', leaves: 'wood' },
    undefined,
    [
      { id: 'fiddle', label: 'Fiddle leaf fig' },
      {
        id: 'monstera',
        label: 'Monstera',
        colors: { pot: '#3a3a3a', soil: '#6e5a3a', stems: '#6a9a50', leaves: '#3a6e42' },
        materials: { stems: 'matte' },
        params: { size: 1.1, height: 1.3 },
      },
      {
        id: 'kentia',
        label: 'Kentia palm',
        colors: { pot: '#b89a6a', stems: '#5f8a45', leaves: '#4c7e40' },
        materials: { pot: 'fabric', stems: 'matte' },
        params: { size: 1.3, height: 1.8 },
      },
    ],
  ),
  kind(
    'plant_small',
    'decor',
    'Shelf plant',
    'floor',
    [
      size(0.3, 0.12, 0.6),
      height(0.3, 0.12, 0.9),
      lift(0.75),
      only(p('trail', 'Trail', 0.6, 0.1, 1.5, 0.05), ['pothos']),
    ],
    { pot: SCANDI.offWhite, soil: '#3c332b', stems: '#7aa648', leaves: '#5a9440', markings: '#e3d268' },
    { pot: 'ceramic', soil: 'matte', stems: 'matte', leaves: 'wood', markings: 'wood' },
    undefined,
    [
      { id: 'pothos', label: 'Golden pothos' },
      {
        id: 'pilea',
        label: 'Chinese money plant',
        colors: { pot: '#c0703f', leaves: '#5b9442', markings: '#8fb05a' },
        materials: { pot: 'terracotta', markings: 'matte' },
        params: { size: 0.3, height: 0.32 },
      },
      {
        id: 'snake',
        label: 'Snake plant',
        colors: { pot: '#9a9a96', leaves: '#3d6538', markings: '#a3b89c' },
        materials: { pot: 'concrete' },
        params: { size: 0.2, height: 0.45 },
      },
    ],
  ),
  kind(
    'plant_wall',
    'decor',
    'Wall plant',
    'wall',
    [width(0.35, 0.2, 1.2), height(1.6, 0.6, 2.3), only(p('ratio', 'Height ratio', 1.5, 0.5, 2.5, 0.05), ['moss'])],
    { mount: '#8a6a48', moss: '#7a7a4a', leaves: '#86a674', accent: '#b08a5a' },
    { mount: 'wood', moss: 'matte', leaves: 'wood', accent: 'matte' },
    undefined,
    [
      { id: 'staghorn', label: 'Staghorn fern' },
      {
        id: 'boston',
        label: 'Boston fern',
        colors: { mount: '#2a2a2a', moss: '#6b5238', leaves: '#62a040', accent: '#6e8e48' },
        materials: { mount: 'metal' },
        params: { width: 0.28 },
      },
      {
        id: 'moss',
        label: 'Moss panel',
        colors: { mount: '#b08a5a', moss: '#6f8a38', leaves: '#5e8a34', accent: '#b5c28a' },
        materials: { leaves: 'matte' },
        params: { width: 0.5, height: 1.5 },
      },
    ],
  ),
  kind(
    'picture',
    'decor',
    'Picture',
    'wall',
    [width(0.5, 0.2, 1.4), height(1.6, 0.8, 2.3), p('ratio', 'Height ratio', 1.3, 0.5, 2, 0.05)],
    { frame: SCANDI.oak, mount: '#efeae2', art: SCANDI.sage },
    { frame: 'wood', mount: 'matte', art: 'matte' },
  ),
  kind(
    'wall_mirror',
    'decor',
    'Wall mirror',
    'wall',
    [size(0.7, 0.3, 1.3), height(1.6, 0.8, 2.3)],
    { frame: SCANDI.oak, glass: SCANDI.mist },
    { frame: 'wood', glass: 'metal' },
  ),
  kind(
    'wall_clock',
    'decor',
    'Wall clock',
    'wall',
    [size(0.3, 0.15, 0.6), height(1.9, 1, 2.4)],
    { rim: SCANDI.oak, face: SCANDI.offWhite, hands: SCANDI.charcoal },
    { rim: 'wood', face: 'matte', hands: 'matte' },
  ),
  kind(
    'vase',
    'decor',
    'Vase',
    'floor',
    [size(0.18, 0.08, 0.4), height(0.3, 0.12, 0.7), lift(0.75)],
    { vase: SCANDI.mist, stems: SCANDI.leaf, flowers: SCANDI.leaf },
    { vase: 'ceramic', stems: 'matte', flowers: 'matte' },
  ),
  kind(
    'books',
    'decor',
    'Books',
    'floor',
    [width(0.26, 0.12, 0.5), height(0.14, 0.06, 0.3), lift(0.75)],
    { covers: SCANDI.clay },
    { covers: 'matte' },
  ),
  kind(
    'basket',
    'decor',
    'Basket',
    'floor',
    [size(0.4, 0.2, 0.7), height(0.36, 0.2, 0.6)],
    { weave: SCANDI.straw },
    { weave: 'fabric' },
  ),
  kind(
    'curtain',
    'decor',
    'Curtain',
    'wall',
    [width(1.4, 0.6, 3), height(2.3, 1.2, 2.6)],
    { fabric: SCANDI.linen, rail: SCANDI.slate },
    { fabric: 'fabric', rail: 'metal' },
    TOGGLE_LEVEL,
  ),

  // Media
  kind(
    'tv',
    'media',
    'TV',
    'floor',
    [inches(60, 24, 110), lift(0)],
    { bezel: SCANDI.ink, screen: SCREEN_OFF_COLOR, stand: SCANDI.oak },
    { bezel: 'matte', screen: 'ceramic', stand: 'wood' },
    TOGGLE,
  ),
  kind(
    'tv_wall',
    'media',
    'Wall TV',
    'wall',
    [inches(60, 24, 110), height(1.3, 0.8, 2)],
    { bezel: SCANDI.ink, screen: SCREEN_OFF_COLOR },
    { bezel: 'matte', screen: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'soundbar',
    'media',
    'Soundbar',
    'floor',
    [width(0.9, 0.4, 1.6), height(0.08, 0.05, 0.15), lift(0)],
    { grille: SCANDI.linen, caps: SCANDI.charcoal },
    { grille: 'fabric', caps: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'speaker',
    'media',
    'Speaker',
    'floor',
    [size(0.16, 0.08, 0.35), height(0.22, 0.1, 0.5), lift(0)],
    { grille: SCANDI.linen, base: SCANDI.oak },
    { grille: 'fabric', base: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'floor_speaker',
    'media',
    'Floor speaker',
    'floor',
    [width(0.22, 0.15, 0.4), height(1, 0.6, 1.3)],
    { cabinet: SCANDI.oak, grille: SCANDI.linen, plinth: SCANDI.oak },
    { cabinet: 'wood', grille: 'fabric', plinth: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'monitor',
    'media',
    'Monitor',
    'floor',
    [width(0.6, 0.4, 1.1), p('ratio', 'Height ratio', 0.6, 0.4, 0.8, 0.02), lift(0)],
    { bezel: SCANDI.ink, screen: SCREEN_OFF_COLOR, stand: SCANDI.slate },
    { bezel: 'matte', screen: 'ceramic', stand: 'metal' },
    TOGGLE,
  ),
  kind(
    'game_console',
    'media',
    'Game console',
    'floor',
    [width(0.3, 0.15, 0.5), height(0.06, 0.04, 0.12), lift(0)],
    { body: SCANDI.offWhite, panel: SCANDI.charcoal },
    { body: 'matte', panel: 'matte' },
    TOGGLE,
  ),
  kind(
    'projector',
    'media',
    'Projector',
    'ceiling',
    [size(0.26, 0.15, 0.45)],
    { body: SCANDI.offWhite, lens: '#2f3336', mount: SCANDI.slate },
    { body: 'matte', lens: 'ceramic', mount: 'metal' },
    TOGGLE,
  ),
  kind(
    'projector_screen',
    'media',
    'Projector screen',
    'ceiling',
    [inches(100, 60, 160)],
    { case: SCANDI.ink, screen: '#f4f3ef' },
    { case: 'matte', screen: 'matte' },
    TOGGLE_LEVEL,
  ),

  // Climate
  kind(
    'radiator',
    'climate',
    'Radiator',
    'wall',
    [width(0.9, 0.4, 2), height(0.6, 0.3, 1.2), p('base', 'Off floor', 0.15, 0, 1)],
    { panel: SCANDI.offWhite, valve: SCANDI.slate },
    { panel: 'metal', valve: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'ac_unit',
    'climate',
    'Air conditioner',
    'wall',
    [width(0.9, 0.6, 1.3), height(2.1, 1.5, 2.5)],
    { body: SCANDI.offWhite, grille: SCANDI.mist, display: '#20262a' },
    { body: 'matte', grille: 'ceramic', display: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_ceiling',
    'climate',
    'Ceiling fan',
    'ceiling',
    [size(1.1, 0.6, 1.6), p('drop', 'Drop', 0.35, 0.1, 1)],
    { housing: SCANDI.offWhite, blades: SCANDI.oak },
    { housing: 'matte', blades: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_standing',
    'climate',
    'Standing fan',
    'floor',
    [size(0.4, 0.25, 0.6), height(1.2, 0.7, 1.6)],
    { stand: SCANDI.offWhite, blades: SCANDI.mist, guard: SCANDI.slate },
    { stand: 'matte', blades: 'matte', guard: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_tower',
    'climate',
    'Tower fan',
    'floor',
    [size(0.24, 0.15, 0.4), height(1, 0.6, 1.4)],
    { body: SCANDI.offWhite, mesh: SCANDI.slate, controls: SCANDI.slate },
    { body: 'matte', mesh: 'metal', controls: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'air_purifier',
    'climate',
    'Air purifier',
    'floor',
    [size(0.28, 0.18, 0.45), height(0.6, 0.35, 0.9)],
    { body: SCANDI.offWhite, filter: SCANDI.linen, grille: '#2f3336', display: '#20262a' },
    { body: 'matte', filter: 'fabric', grille: 'matte', display: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'humidifier',
    'climate',
    'Humidifier',
    'floor',
    [size(0.2, 0.12, 0.35), height(0.32, 0.2, 0.5), lift(0)],
    { body: SCANDI.offWhite, collar: SCANDI.mist, nozzle: '#2f3336' },
    { body: 'ceramic', collar: 'ceramic', nozzle: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'thermostat',
    'climate',
    'Thermostat',
    'wall',
    [size(0.11, 0.07, 0.2), height(1.45, 0.8, 2)],
    { ring: SCANDI.offWhite, back: SCANDI.offWhite, face: SCANDI.charcoal },
    { ring: 'metal', back: 'matte', face: 'ceramic' },
    READOUT,
  ),

  // Covers
  kind(
    'blind',
    'cover',
    'Blind',
    'wall',
    [width(1.2, 0.5, 3), height(2.1, 1, 2.5), p('drop', 'Drop', 1.4, 0.3, 2.2)],
    { slats: SCANDI.linen, rail: SCANDI.slate },
    { slats: 'fabric', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'roller_shutter',
    'cover',
    'Roller shutter',
    'wall',
    [width(1.2, 0.5, 3), height(2.1, 1, 2.5), p('drop', 'Drop', 1.4, 0.3, 2.2)],
    { slats: SCANDI.mist, rail: SCANDI.slate },
    { slats: 'metal', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'window',
    'cover',
    'Window',
    'wall',
    [width(1.2, 0.5, 3), height(1.2, 0.5, 2), p('sill', 'Sill height', 0.9, 0, 1.6), flag('flip', 'Hinge right')],
    { frame: SCANDI.offWhite, glass: SCANDI.mist },
    { frame: 'matte', glass: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'door',
    'cover',
    'Door',
    'wall',
    [width(0.85, 0.6, 1.4), height(2.05, 1.8, 2.4), flag('flip', 'Hinge right')],
    { frame: SCANDI.offWhite, panel: SCANDI.offWhite, handle: SCANDI.charcoal },
    { frame: 'matte', panel: 'matte', handle: 'metal' },
    TOGGLE,
  ),
  kind(
    'sliding_door',
    'cover',
    'Sliding door',
    'wall',
    [width(1.8, 0.9, 5), height(2.1, 1.8, 2.5), panels(), flag('flip', 'Slide left')],
    { frame: SCANDI.slate, panel: SCANDI.offWhite },
    { frame: 'metal', panel: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'sliding_glass',
    'cover',
    'Sliding glass door',
    'wall',
    [width(2.4, 1.2, 6), height(2.2, 1.8, 2.6), panels(), flag('flip', 'Slide left')],
    { frame: SCANDI.slate, glass: SCANDI.mist },
    { frame: 'metal', glass: 'ceramic' },
    TOGGLE_LEVEL,
  ),
  kind(
    'garage_door',
    'cover',
    'Garage door',
    'wall',
    [width(2.5, 1.8, 4), height(2.2, 1.8, 2.6)],
    { panels: SCANDI.mist, rail: SCANDI.slate },
    { panels: 'metal', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'awning',
    'cover',
    'Awning',
    'wall',
    [width(2, 1, 4), height(2.3, 1.8, 2.6), p('drop', 'Extension', 1, 0.3, 2)],
    { canopy: SCANDI.linen, cassette: SCANDI.slate },
    { canopy: 'fabric', cassette: 'metal' },
    TOGGLE_LEVEL,
  ),

  // Security and sensors
  kind(
    'camera',
    'security',
    'Camera',
    'wall',
    [size(0.1, 0.06, 0.2), height(2.2, 1.2, 2.5)],
    { body: SCANDI.offWhite, lens: SCANDI.charcoal, mount: SCANDI.slate },
    { body: 'matte', lens: 'ceramic', mount: 'metal' },
    TOGGLE,
  ),
  kind(
    'doorbell',
    'security',
    'Doorbell',
    'wall',
    [size(0.07, 0.04, 0.14), height(1.4, 0.9, 1.8)],
    { body: SCANDI.slate, lens: SCANDI.charcoal, button: SCANDI.charcoal },
    { body: 'metal', lens: 'ceramic', button: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'motion_sensor',
    'security',
    'Motion sensor',
    'wall',
    [size(0.07, 0.04, 0.14), height(2.3, 1.2, 2.5)],
    { body: SCANDI.offWhite, dome: SCANDI.offWhite, lens: SCANDI.charcoal },
    { body: 'matte', dome: 'ceramic', lens: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'smoke_detector',
    'security',
    'Smoke detector',
    'ceiling',
    [size(0.14, 0.08, 0.25)],
    { body: SCANDI.offWhite, vents: SCANDI.slate },
    { body: 'matte', vents: 'matte' },
    TOGGLE,
  ),
  kind(
    'alarm_panel',
    'security',
    'Alarm panel',
    'wall',
    [size(0.16, 0.1, 0.3), height(1.5, 0.9, 2)],
    { body: SCANDI.offWhite, glass: SCANDI.charcoal, screen: SCANDI.mist, keys: SCANDI.slate },
    { body: 'matte', glass: 'ceramic', screen: 'ceramic', keys: 'matte' },
    READOUT,
  ),
  kind(
    'smart_lock',
    'security',
    'Smart lock',
    'wall',
    [size(0.09, 0.05, 0.16), height(1.05, 0.7, 1.4)],
    { body: SCANDI.slate, turn: SCANDI.slate },
    { body: 'metal', turn: 'metal' },
    TOGGLE,
  ),
  kind(
    'air_quality',
    'security',
    'Air quality sensor',
    'floor',
    [size(0.1, 0.06, 0.2), lift(0)],
    { body: SCANDI.offWhite, screen: SCANDI.mist, vents: SCANDI.slate },
    { body: 'matte', screen: 'ceramic', vents: 'matte' },
    READOUT,
  ),

  // Utility
  kind(
    'vacuum_robot',
    'utility',
    'Robot vacuum',
    'floor',
    [size(0.35, 0.25, 0.45)],
    // Dark grey, the way most of them are sold now, with a lighter grey
    // bumper and dock so the bumper reads against the body.
    { body: '#575a5c', bumper: '#818283', brushes: SCANDI.ink },
    { body: 'matte', bumper: 'matte', brushes: 'matte' },
    TOGGLE,
  ),
]

export const decorationKind = (id: string) => DECORATION_KINDS.find(k => k.id === id)

// A saved size onto the stops its slider actually offers. A plan written
// before a slider's steps changed can hold a value between two of them, or
// outside the range altogether, and a slider cannot show either: the thumb
// lands somewhere the number is not. Everything reads its sizes through
// here, so the plan is drawn at the size the editor would show.
export function snapParam(spec: DecorationParam, value: number) {
  if (!Number.isFinite(value)) return spec.default
  const inside = Math.min(Math.max(value, spec.min), spec.max)
  const stops = Math.round((inside - spec.min) / spec.step)
  return round2(spec.min + stops * spec.step)
}

export function paramValue(
  kind: DecorationKind,
  params: Record<string, number> | undefined,
  id: string,
  variant?: string,
) {
  const spec = kind.params.find(p => p.id === id)
  const saved = params?.[id]
  if (!spec) return saved ?? 0
  if (saved !== undefined) return snapParam(spec, saved)
  // Nothing saved: the style's own default, then the kind's.
  const own = decorationVariant(kind, variant)?.params?.[id]
  return own === undefined ? spec.default : snapParam(spec, own)
}

// The style an item is drawn in: the one it names, or the kind's first.
export function decorationVariant(kind: DecorationKind, variant: string | undefined) {
  if (!kind.variants || kind.variants.length === 0) return undefined
  return kind.variants.find(v => v.id === variant) ?? kind.variants[0]
}

// An item's saved parameters once it changes style. Whatever the new style
// has a real default for is dropped, so a pendant switched to another lamp
// takes that lamp's size rather than keeping the last one's.
export function withoutStyleDefaults(
  kind: DecorationKind,
  params: Record<string, number> | undefined,
  variant: string,
) {
  const own = decorationVariant(kind, variant)?.params
  if (!params || !own) return params
  const kept = Object.fromEntries(Object.entries(params).filter(([id]) => !(id in own)))
  return Object.keys(kept).length > 0 ? kept : undefined
}

// The slots a style paints, which stand in for the kind's own when it has
// any. A style that paints the same parts brings none and uses the kind's.
export function kindColors(kind: DecorationKind, variant?: string) {
  return decorationVariant(kind, variant)?.colors ?? kind.colors
}

export function kindMaterials(kind: DecorationKind, variant?: string) {
  return decorationVariant(kind, variant)?.materials ?? kind.materials
}

export function colorValue(
  kind: DecorationKind,
  colors: Record<string, string> | undefined,
  slot: string,
  variant?: string,
) {
  return colors?.[slot] ?? kindColors(kind, variant)[slot] ?? '#ffffff'
}

// The surface of a slot is part of what the piece is, so it comes from the
// kind. Only the color is the viewer's to pick.
export function materialValue(kind: DecorationKind, slot: string, variant?: string) {
  return kindMaterials(kind, variant)?.[slot] ?? 'matte'
}

// Footprint on the plan, for the 2D editor.
// A screen's diagonal in inches as its width and height in meters, always
// in 16:9.
export function screenSize(inches: number): [number, number] {
  const diagonal = inches * 0.0254
  return [(diagonal * 16) / Math.hypot(16, 9), (diagonal * 9) / Math.hypot(16, 9)]
}

export function footprint(
  kind: DecorationKind,
  params: Record<string, number> | undefined,
  variant?: string,
): [number, number] {
  // A strip lies along its length, which is the x of its model, so the plan
  // has to read the same way round or the two disagree by a right angle.
  if (kind.family === 'light' && kind.params.some(x => x.id === 'length')) {
    return [paramValue(kind, params, 'length', variant), 0.08]
  }
  const screen = kind.params.some(x => x.id === 'inches')
  const w = screen
    ? screenSize(paramValue(kind, params, 'inches', variant))[0]
    : paramValue(kind, params, 'width', variant) || paramValue(kind, params, 'size', variant) || 0.3
  const d =
    (styleParams(kind, variant).some(p => p.id === 'reach') ? paramValue(kind, params, 'reach', variant) : 0) ||
    paramValue(kind, params, 'depth', variant) ||
    paramValue(kind, params, 'length', variant) ||
    (kind.params.some(p => p.id === 'size') ? w : 0.3)
  return [w, d]
}

// Items that hang on a wall but stand on the floor, so their height
// parameter is their own size and not how high they are mounted.
const FLOOR_STANDING = new Set(['door', 'sliding_door', 'sliding_glass', 'garage_door', 'radiator'])

// How high above the floor an item's own origin sits. Lights build
// themselves at full height, ceiling items hang from the ceiling, a window
// starts at its sill, and most wall items hang at their height parameter.
export function mountHeight(kind: DecorationKind, params: Record<string, number> | undefined): number {
  if (kind.family === 'light') return 0
  if (kind.mount === 'ceiling') return CEILING_HEIGHT_M
  if (kind.mount !== 'wall') return 0
  if (FLOOR_STANDING.has(kind.id)) return 0
  if (kind.id === 'window') return paramValue(kind, params, 'sill')
  return paramValue(kind, params, 'height')
}

// How many leaves a run of a given width is divided into, each one between
// `min` and `max` meters wide.
export function leafCount(width: number, min = 0.5, max = 1) {
  const fewest = Math.ceil(width / max)
  const most = Math.max(1, Math.floor(width / min))
  return Math.min(Math.max(Math.round(width / 0.75), fewest), Math.max(fewest, most))
}

// The base units of a counter run, left to right, as widths. All are a full
// unit but one, which takes up what is left and stands at place `grow`. It
// runs from nothing to a unit, or with `wide` from a unit to just short of
// two, so the run adds a unit each time that one reaches its limit.
export const COUNTER_UNIT = 0.6

export function counterModules(width: number, wide: boolean, grow: number) {
  const full = Math.floor(width / COUNTER_UNIT + 1e-6)
  const rest = Math.max(0, width - full * COUNTER_UNIT)
  const units = wide ? Math.max(full - 1, 0) : full
  const growing = wide ? width - units * COUNTER_UNIT : rest
  const count = units + (growing > 0.005 ? 1 : 0)
  const at = ((grow % count) + count) % count
  return Array.from({ length: count }, (_, i) => (count > units && i === at ? growing : COUNTER_UNIT))
}

// The most shelves a bookshelf takes, however tall.
export const MAX_SHELVES = 12

// How many shelves stand between a bookshelf's bottom and its top: about
// one every 36 cm of height, and `extra` more or fewer.
export function bookshelfShelves(height: number, extra: number) {
  const auto = Math.max(1, Math.round((height - 0.06) / 0.36)) - 1
  return Math.min(Math.max(auto + Math.round(extra), 0), MAX_SHELVES)
}

// The count an adjust parameter ends at, and the most it can reach.
export function adjustedCount(kind: DecorationKind, params: Record<string, number> | undefined, variant?: string) {
  const v = (id: string) => paramValue(kind, params, id, variant)
  if (kind.id !== 'bookshelf') return { count: 0, max: 0 }
  return { count: bookshelfShelves(v('height'), v('shelves')), max: MAX_SHELVES }
}

// How many places a cycle parameter steps through.
export function cycleLength(kind: DecorationKind, params: Record<string, number> | undefined, variant?: string) {
  if (kind.id !== 'kitchen_counter' && kind.id !== 'upper_cabinets') return 1
  const v = (id: string) => paramValue(kind, params, id, variant)
  return counterModules(v('width'), v('wide') > 0.5, 0).length
}

// Items with a flat top that other things can stand on, and how high that
// top is: their own height parameter, or a fixed height when they have none.
const SURFACE_TOPS: Record<string, string | number> = {
  dining_table: 'height',
  coffee_table: 'height',
  side_table: 'height',
  desk: 'height',
  nightstand: 'height',
  sideboard: 'height',
  dresser: 'height',
  shoe_rack: 'height',
  bookshelf: 'height',
  stool: 'height',
  kitchen_counter: 'height',
  washing_machine: 'height',
  dryer: 'height',
  half_wall: 'height',
  bench: 'height',
  pouf: 'height',
}

// Items let into a worktop rather than set on it, and how far their origin
// moves for it: down into the worktop, or up when the item hangs below its
// own rim, as a sink does. Never exactly flush, since two surfaces in the
// same plane fight over which one is drawn.
const BUILT_IN: Record<string, number> = { hob: 0.01, kitchen_sink: -0.015 }

export const isSupport = (kind: DecorationKind) => kind.id in SURFACE_TOPS
// Anything with a "Standing on" parameter is meant to stand on something.
export const canRide = (kind: DecorationKind) => kind.params.some(p => p.id === 'lift')
export const isBuiltIn = (kind: DecorationKind) => kind.id in BUILT_IN
// Positive sinks the item into the top, negative lifts it clear of it.
export const builtInDepth = (kind: DecorationKind) => BUILT_IN[kind.id] ?? 0

// Height of an item's top surface above its own base.
export function surfaceTop(kind: DecorationKind, params: Record<string, number> | undefined, variant?: string) {
  const top = SURFACE_TOPS[kind.id]
  return typeof top === 'number' ? top : paramValue(kind, params, top, variant)
}

// Usable area of a top, inset so things do not hang over the edge.
export function surfaceRect(
  kind: DecorationKind,
  params: Record<string, number> | undefined,
  variant?: string,
): [number, number] {
  const [w, d] = footprint(kind, params, variant)
  return [Math.max(w - 0.1, w * 0.4), Math.max(d - 0.1, d * 0.4)]
}
