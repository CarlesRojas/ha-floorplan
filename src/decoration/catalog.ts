import type { Signal } from '#/signals.ts'
import {
  CEILING_HEIGHT_M,
  LIGHT_BASE_COLOR,
  LIGHT_CORD_COLOR,
  LIGHT_SHADE_COLOR,
  SCANDI,
  SCREEN_OFF_COLOR,
} from '#/theme.ts'

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
    [size(0.4, 0.15, 1), p('cord', 'Cord length', 0.8, 0.2, 2)],
    { slats: LIGHT_BASE_COLOR, rings: SCANDI.slate, diffuser: LIGHT_SHADE_COLOR, cord: LIGHT_CORD_COLOR },
    { slats: 'wood', rings: 'metal', diffuser: 'matte', cord: 'fabric' },
    LIGHT_SIGNALS,
    [
      { id: 'slatted', label: 'Slatted drum' },
      {
        id: 'globe',
        label: 'Globe in a cage',
        colors: { globe: LIGHT_SHADE_COLOR, cage: LIGHT_BASE_COLOR, cord: LIGHT_CORD_COLOR },
        materials: { globe: 'matte', cage: 'wood', cord: 'fabric' },
      },
    ],
  ),
  kind(
    'light_floor',
    'light',
    'Floor lamp',
    'floor',
    [size(0.4, 0.2, 0.8), height(1.5, 0.8, 2.2)],
    { shade: LIGHT_SHADE_COLOR, stand: LIGHT_BASE_COLOR },
    { shade: 'fabric', stand: 'wood' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_table',
    'light',
    'Table lamp',
    'floor',
    [size(0.3, 0.15, 0.6), height(0.45, 0.2, 0.9), lift(0.75)],
    { globe: LIGHT_SHADE_COLOR, basket: LIGHT_BASE_COLOR },
    { globe: 'ceramic', basket: 'wood' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_wall',
    'light',
    'Wall light',
    'wall',
    [size(0.25, 0.1, 0.6), height(1.8, 0.5, 2.5)],
    { shade: LIGHT_SHADE_COLOR, channel: LIGHT_BASE_COLOR },
    { shade: 'fabric', channel: 'wood' },
    LIGHT_SIGNALS,
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
    [width(2.1, 1.2, 3.4), depth(0.88, 0.7, 1.1)],
    { frame: SCANDI.oak, upholstery: SCANDI.linen, cushions: SCANDI.linen },
    { frame: 'wood', upholstery: 'fabric', cushions: 'fabric' },
  ),
  kind(
    'armchair',
    'seating',
    'Armchair',
    'floor',
    [width(0.78, 0.6, 1.1), depth(0.8, 0.6, 1)],
    { frame: SCANDI.oak, upholstery: SCANDI.linen, cushions: SCANDI.linen },
    { frame: 'wood', upholstery: 'fabric', cushions: 'fabric' },
  ),
  kind(
    'dining_chair',
    'seating',
    'Dining chair',
    'floor',
    [width(0.46, 0.35, 0.6), depth(0.48, 0.35, 0.6)],
    { shell: SCANDI.slate, legs: SCANDI.charcoal },
    { shell: 'fabric', legs: 'metal' },
  ),
  kind(
    'office_chair',
    'seating',
    'Office chair',
    'floor',
    [width(0.64, 0.5, 0.8), depth(0.62, 0.5, 0.8), height(0.48, 0.38, 0.62)],
    { seat: SCANDI.slate, back: SCANDI.charcoal, frame: SCANDI.charcoal, base: SCANDI.slate },
    { seat: 'fabric', back: 'fabric', frame: 'metal', base: 'metal' },
  ),
  kind(
    'stool',
    'seating',
    'Stool',
    'floor',
    [size(0.34, 0.25, 0.5), height(0.45, 0.3, 0.8)],
    { legs: SCANDI.oak, seat: SCANDI.oak },
    { legs: 'wood', seat: 'wood' },
  ),
  kind(
    'bench',
    'seating',
    'Bench',
    'floor',
    [width(1.3, 0.8, 2.2), depth(0.4, 0.3, 0.6)],
    { legs: SCANDI.oak, seat: SCANDI.oak },
    { legs: 'wood', seat: 'wood' },
  ),
  kind(
    'pouf',
    'seating',
    'Pouf',
    'floor',
    [size(0.5, 0.3, 0.8), height(0.4, 0.25, 0.55)],
    { cover: SCANDI.clay },
    { cover: 'fabric' },
  ),

  // Tables
  kind(
    'dining_table',
    'table',
    'Dining table',
    'floor',
    [width(1.6, 0.9, 3), depth(0.9, 0.7, 1.2), height(0.75, 0.6, 0.85)],
    { top: SCANDI.oak, frame: SCANDI.charcoal },
    { top: 'wood', frame: 'metal' },
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
    [width(1.4, 0.9, 2.2), depth(0.68, 0.5, 0.9), height(0.74, 0.65, 0.85)],
    { top: SCANDI.oak, legs: SCANDI.oak, drawer: SCANDI.offWhite, handle: SCANDI.slate },
    { top: 'wood', legs: 'wood', drawer: 'matte', handle: 'metal' },
  ),
  kind(
    'office_table',
    'table',
    'Office table',
    'floor',
    [width(1.6, 1.1, 2.4), depth(0.8, 0.6, 1), height(0.74, 0.65, 1.2)],
    { top: SCANDI.oak, frame: SCANDI.charcoal, tray: SCANDI.slate },
    { top: 'wood', frame: 'metal', tray: 'metal' },
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
    [width(0.9, 0.5, 2), depth(0.32, 0.2, 0.5), height(1.8, 0.8, 2.4)],
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
    { frame: SCANDI.oak, bedding: SCANDI.offWhite, pillows: SCANDI.linen },
    { frame: 'wood', bedding: 'fabric', pillows: 'fabric' },
  ),
  kind(
    'crib',
    'bed',
    'Crib',
    'floor',
    [width(0.7, 0.55, 0.9), length(1.25, 1, 1.5, 0.05)],
    { frame: SCANDI.oak, bedding: SCANDI.offWhite },
    { frame: 'wood', bedding: 'fabric' },
  ),

  // Kitchen
  kind(
    'kitchen_counter',
    'kitchen',
    'Counter',
    'floor',
    [width(1.8, 0.6, 4), depth(0.62, 0.5, 0.8), height(0.9, 0.8, 1)],
    { worktop: SCANDI.oak, cabinets: SCANDI.offWhite, fronts: SCANDI.offWhite },
    { worktop: 'wood', cabinets: 'matte', fronts: 'matte' },
  ),
  kind(
    'kitchen_island',
    'kitchen',
    'Island',
    'floor',
    [width(1.8, 1, 3), depth(0.9, 0.7, 1.2), height(0.92, 0.8, 1.1)],
    { worktop: SCANDI.oak, cabinets: SCANDI.sage, fronts: SCANDI.sage },
    { worktop: 'wood', cabinets: 'matte', fronts: 'matte' },
  ),
  kind(
    'upper_cabinets',
    'kitchen',
    'Upper cabinets',
    'wall',
    [width(1.6, 0.6, 3.5), depth(0.35, 0.25, 0.45), height(1.5, 1.2, 2)],
    { cabinets: SCANDI.offWhite, doors: SCANDI.offWhite, handles: SCANDI.slate },
    { cabinets: 'matte', doors: 'matte', handles: 'metal' },
  ),
  kind(
    'fridge',
    'kitchen',
    'Fridge',
    'floor',
    [width(0.6, 0.5, 0.95), depth(0.65, 0.5, 0.8), height(1.85, 0.8, 2.1), base()],
    { body: SCANDI.offWhite, doors: SCANDI.offWhite, handles: SCANDI.slate },
    { body: 'ceramic', doors: 'ceramic', handles: 'metal' },
    TOGGLE,
  ),
  kind(
    'oven',
    'kitchen',
    'Oven',
    'floor',
    [width(0.6, 0.5, 0.9), depth(0.6, 0.5, 0.7), height(0.88, 0.6, 1), base()],
    { body: SCANDI.offWhite, glass: '#3c4144', handle: SCANDI.slate, knobs: SCANDI.slate },
    { body: 'ceramic', glass: 'ceramic', handle: 'metal', knobs: 'metal' },
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
    [width(0.5, 0.35, 0.7), depth(0.38, 0.3, 0.5), lift(1.2)],
    { body: SCANDI.offWhite, glass: '#3c4144', handle: SCANDI.slate, knobs: SCANDI.slate },
    { body: 'ceramic', glass: 'ceramic', handle: 'metal', knobs: 'metal' },
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
    [width(0.9, 0.7, 1.4), depth(0.9, 0.7, 1.4), height(2, 1.8, 2.3)],
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
    'Large plant',
    'floor',
    [size(0.6, 0.3, 1.2), height(1.3, 0.6, 2.2)],
    { pot: SCANDI.clay, soil: '#3c332b', stems: SCANDI.leaf, leaves: SCANDI.leaf },
    { pot: 'ceramic', soil: 'matte', stems: 'matte', leaves: 'matte' },
  ),
  kind(
    'plant_small',
    'decor',
    'Small plant',
    'floor',
    [size(0.25, 0.12, 0.5), lift(0.75)],
    { pot: SCANDI.clay, soil: '#3c332b', leaves: SCANDI.leaf },
    { pot: 'ceramic', soil: 'matte', leaves: 'matte' },
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
    'contact_sensor',
    'security',
    'Door sensor',
    'wall',
    [size(0.06, 0.03, 0.12), height(2, 0.5, 2.4)],
    { body: SCANDI.offWhite },
    { body: 'matte' },
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
    { body: SCANDI.offWhite, bumper: SCANDI.charcoal, brushes: SCANDI.charcoal },
    { body: 'matte', bumper: 'matte', brushes: 'matte' },
    TOGGLE,
  ),
  kind(
    'smart_plug',
    'utility',
    'Smart plug',
    'wall',
    [size(0.07, 0.04, 0.12), height(0.3, 0.1, 1.4)],
    { body: SCANDI.offWhite, socket: SCANDI.offWhite, pins: SCANDI.charcoal },
    { body: 'matte', socket: 'matte', pins: 'matte' },
    TOGGLE,
  ),
  kind(
    'switch_panel',
    'utility',
    'Switch panel',
    'wall',
    [size(0.09, 0.06, 0.16), height(1.1, 0.8, 1.5)],
    { plate: SCANDI.offWhite, rockers: SCANDI.linen },
    { plate: 'matte', rockers: 'matte' },
    TOGGLE,
  ),
]

export const decorationKind = (id: string) => DECORATION_KINDS.find(k => k.id === id)

export function paramValue(kind: DecorationKind, params: Record<string, number> | undefined, id: string) {
  return params?.[id] ?? kind.params.find(p => p.id === id)?.default ?? 0
}

// The style an item is drawn in: the one it names, or the kind's first.
export function decorationVariant(kind: DecorationKind, variant: string | undefined) {
  if (!kind.variants || kind.variants.length === 0) return undefined
  return kind.variants.find(v => v.id === variant) ?? kind.variants[0]
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

export function footprint(kind: DecorationKind, params: Record<string, number> | undefined): [number, number] {
  // A strip lies along its length, which is the x of its model, so the plan
  // has to read the same way round or the two disagree by a right angle.
  if (kind.family === 'light' && kind.params.some(x => x.id === 'length')) {
    return [paramValue(kind, params, 'length'), 0.08]
  }
  const screen = kind.params.some(x => x.id === 'inches')
  const w = screen
    ? screenSize(paramValue(kind, params, 'inches'))[0]
    : paramValue(kind, params, 'width') || paramValue(kind, params, 'size') || 0.3
  const d =
    paramValue(kind, params, 'depth') ||
    paramValue(kind, params, 'length') ||
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

// Items with a flat top that other things can stand on, and how high that
// top is: their own height parameter, or a fixed height when they have none.
const SURFACE_TOPS: Record<string, string | number> = {
  dining_table: 'height',
  coffee_table: 'height',
  side_table: 'height',
  desk: 'height',
  office_table: 'height',
  nightstand: 'height',
  sideboard: 'height',
  dresser: 'height',
  shoe_rack: 'height',
  bookshelf: 'height',
  stool: 'height',
  kitchen_counter: 'height',
  kitchen_island: 'height',
  washing_machine: 'height',
  dryer: 'height',
  half_wall: 'height',
  bench: 0.42,
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
export function surfaceTop(kind: DecorationKind, params: Record<string, number> | undefined) {
  const top = SURFACE_TOPS[kind.id]
  return typeof top === 'number' ? top : paramValue(kind, params, top)
}

// Usable area of a top, inset so things do not hang over the edge.
export function surfaceRect(kind: DecorationKind, params: Record<string, number> | undefined): [number, number] {
  const [w, d] = footprint(kind, params)
  return [Math.max(w - 0.1, w * 0.4), Math.max(d - 0.1, d * 0.4)]
}
