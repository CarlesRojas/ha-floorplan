import type { Signal } from '#/signals.ts'
import { CEILING_HEIGHT_M, LIGHT_BASE_COLOR, LIGHT_CORD_COLOR, LIGHT_SHADE_COLOR, SCANDI, SCREEN_OFF_COLOR } from '#/theme.ts'

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
  // Signals the model can express visually. Anything else can still be
  // bound, the model just does not change.
  expresses: Signal[]
}

// Parameter shorthands. Every length is in meters.
const p = (
  id: string,
  label: string,
  d: number,
  min: number,
  max: number,
  step = 0.05,
  unit?: string,
): DecorationParam => ({
  id,
  label,
  default: d,
  min,
  max,
  step,
  unit,
})
const width = (d: number, min = 0.3, max = 4) => p('width', 'Width', d, min, max)
const depth = (d: number, min = 0.2, max = 3) => p('depth', 'Depth', d, min, max)
const height = (d: number, min = 0.2, max = 2.6) => p('height', 'Height', d, min, max)
const size = (d: number, min = 0.1, max = 1.5) => p('size', 'Size', d, min, max)
const length = (d: number, min = 0.2, max = 10, step = 0.1) => p('length', 'Length', d, min, max, step)
// Height an item stands at when it is not standing on anything.
const lift = (d: number, max = 1.5) => p('lift', 'Standing on', d, 0, max)
const panels = (d = 2, max = 5) => p('panels', 'Panels', d, 1, max, 1, '')
// Screens are sold by the diagonal, and they are all 16:9.
const inches = (d: number, min = 24, max = 120) => p('inches', 'Screen', d, min, max, 1, '"')

// Signal sets.
const NONE: Signal[] = []
const TOGGLE: Signal[] = ['toggle']
const TOGGLE_LEVEL: Signal[] = ['toggle', 'level']
const LIGHT_SIGNALS: Signal[] = ['toggle', 'level', 'color', 'warmth']
const READOUT: Signal[] = ['value', 'enum', 'toggle']

// Shared palettes, all from the theme's Scandinavian set.
const woodOnly = { body: SCANDI.oak }
const woodMat = { body: 'wood' }
const softBody = { body: SCANDI.linen, frame: SCANDI.oak }
const softMat = { body: 'fabric', frame: 'wood' }
const applianceBody = { body: SCANDI.offWhite, trim: SCANDI.slate }
const applianceMat = { body: 'ceramic', trim: 'metal' }
const lightColors = { shade: LIGHT_SHADE_COLOR, base: LIGHT_BASE_COLOR }
const lightMaterials = { shade: 'fabric', base: 'wood' }

const kind = (
  id: string,
  family: string,
  label: string,
  mount: Mount,
  params: DecorationParam[],
  colors: Record<string, string>,
  materials: Record<string, string>,
  expresses: Signal[] = NONE,
): DecorationKind => ({ id, family, label, mount, params, colors, materials, expresses })

export const DECORATION_KINDS: DecorationKind[] = [
  // Lights
  kind(
    'light_ceiling',
    'light',
    'Ceiling light',
    'ceiling',
    [size(0.45, 0.2, 1.2)],
    lightColors,
    lightMaterials,
    LIGHT_SIGNALS,
  ),
  kind(
    'light_pendant',
    'light',
    'Pendant',
    'ceiling',
    [size(0.4, 0.15, 1), p('cord', 'Cord length', 0.8, 0.2, 2)],
    { ...lightColors, cord: LIGHT_CORD_COLOR },
    { ...lightMaterials, cord: 'fabric' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_floor',
    'light',
    'Floor lamp',
    'floor',
    [size(0.4, 0.2, 0.8), height(1.5, 0.8, 2.2)],
    lightColors,
    lightMaterials,
    LIGHT_SIGNALS,
  ),
  kind(
    'light_table',
    'light',
    'Table lamp',
    'floor',
    [size(0.3, 0.15, 0.6), height(0.45, 0.2, 0.9), lift(0.75)],
    lightColors,
    lightMaterials,
    LIGHT_SIGNALS,
  ),
  kind(
    'light_wall',
    'light',
    'Wall light',
    'wall',
    [size(0.25, 0.1, 0.6), height(1.8, 0.5, 2.5)],
    lightColors,
    lightMaterials,
    LIGHT_SIGNALS,
  ),
  kind(
    'light_strip',
    'light',
    'LED strip',
    'floor',
    [length(1), height(0.02, 0, 2.6)],
    { base: LIGHT_BASE_COLOR },
    { base: 'matte' },
    LIGHT_SIGNALS,
  ),
  kind(
    'light_spot',
    'light',
    'Spot',
    'ceiling',
    [size(0.12, 0.06, 0.3)],
    { base: LIGHT_BASE_COLOR },
    { base: 'metal' },
    LIGHT_SIGNALS,
  ),

  // Seating
  kind('sofa', 'seating', 'Sofa', 'floor', [width(2.1, 1.2, 3.4), depth(0.88, 0.7, 1.1)], softBody, softMat),
  kind('armchair', 'seating', 'Armchair', 'floor', [width(0.78, 0.6, 1.1), depth(0.8, 0.6, 1)], softBody, softMat),
  kind(
    'dining_chair',
    'seating',
    'Dining chair',
    'floor',
    [width(0.46, 0.35, 0.6), depth(0.48, 0.35, 0.6)],
    { body: SCANDI.oak, seat: SCANDI.linen },
    { body: 'wood', seat: 'fabric' },
  ),
  kind('stool', 'seating', 'Stool', 'floor', [size(0.34, 0.25, 0.5), height(0.45, 0.3, 0.8)], woodOnly, woodMat),
  kind('bench', 'seating', 'Bench', 'floor', [width(1.3, 0.8, 2.2), depth(0.4, 0.3, 0.6)], woodOnly, woodMat),
  kind(
    'pouf',
    'seating',
    'Pouf',
    'floor',
    [size(0.5, 0.3, 0.8), height(0.4, 0.25, 0.55)],
    { body: SCANDI.clay },
    { body: 'fabric' },
  ),

  // Tables
  kind(
    'dining_table',
    'table',
    'Dining table',
    'floor',
    [width(1.6, 0.9, 3), depth(0.9, 0.7, 1.2), height(0.75, 0.6, 0.85)],
    woodOnly,
    woodMat,
  ),
  kind(
    'coffee_table',
    'table',
    'Coffee table',
    'floor',
    [width(1.1, 0.6, 1.6), depth(0.6, 0.4, 0.9), height(0.4, 0.3, 0.5)],
    woodOnly,
    woodMat,
  ),
  kind('side_table', 'table', 'Side table', 'floor', [size(0.45, 0.3, 0.7), height(0.5, 0.35, 0.7)], woodOnly, woodMat),
  kind(
    'desk',
    'table',
    'Desk',
    'floor',
    [width(1.4, 0.9, 2.2), depth(0.68, 0.5, 0.9), height(0.74, 0.65, 0.85)],
    woodOnly,
    woodMat,
  ),
  kind(
    'console_table',
    'table',
    'Console table',
    'floor',
    [width(1.1, 0.7, 1.8), depth(0.36, 0.25, 0.5), height(0.8, 0.7, 0.95)],
    woodOnly,
    woodMat,
  ),
  kind(
    'nightstand',
    'table',
    'Nightstand',
    'floor',
    [width(0.45, 0.3, 0.7), depth(0.4, 0.3, 0.5), height(0.5, 0.35, 0.7)],
    woodOnly,
    woodMat,
  ),

  // Storage
  kind(
    'bookshelf',
    'storage',
    'Bookshelf',
    'floor',
    [width(0.9, 0.5, 2), depth(0.32, 0.2, 0.5), height(1.8, 0.8, 2.4)],
    { body: SCANDI.oak, books: SCANDI.clay },
    { body: 'wood', books: 'matte' },
  ),
  kind(
    'sideboard',
    'storage',
    'Sideboard',
    'floor',
    [width(1.6, 0.9, 2.6), depth(0.42, 0.3, 0.6), height(0.75, 0.6, 1)],
    { body: SCANDI.oak, front: SCANDI.offWhite },
    { body: 'wood', front: 'matte' },
  ),
  kind(
    'wardrobe',
    'storage',
    'Wardrobe',
    'floor',
    [width(1.2, 0.6, 2.6), depth(0.6, 0.45, 0.75), height(2.1, 1.6, 2.5)],
    { body: SCANDI.offWhite, front: SCANDI.oak },
    { body: 'matte', front: 'wood' },
  ),
  kind(
    'dresser',
    'storage',
    'Dresser',
    'floor',
    [width(1, 0.6, 1.8), depth(0.45, 0.35, 0.6), height(0.9, 0.6, 1.3)],
    { body: SCANDI.oak, front: SCANDI.offWhite },
    { body: 'wood', front: 'matte' },
  ),
  kind(
    'shoe_rack',
    'storage',
    'Shoe rack',
    'floor',
    [width(0.8, 0.5, 1.4), depth(0.3, 0.2, 0.4), height(0.5, 0.3, 0.9)],
    woodOnly,
    woodMat,
  ),
  kind(
    'wall_shelf',
    'storage',
    'Wall shelf',
    'wall',
    [width(0.9, 0.4, 1.8), depth(0.24, 0.15, 0.4), height(1.5, 0.6, 2.3)],
    woodOnly,
    woodMat,
  ),

  // Bedroom
  kind(
    'bed_double',
    'bed',
    'Bed',
    'floor',
    [width(1.6, 0.9, 2), length(2.05, 1.8, 2.3, 0.05)],
    { body: SCANDI.oak, bedding: SCANDI.offWhite, pillow: SCANDI.linen },
    { body: 'wood', bedding: 'fabric', pillow: 'fabric' },
  ),
  kind(
    'crib',
    'bed',
    'Crib',
    'floor',
    [width(0.7, 0.55, 0.9), length(1.25, 1, 1.5, 0.05)],
    { body: SCANDI.oak, bedding: SCANDI.offWhite },
    { body: 'wood', bedding: 'fabric' },
  ),

  // Kitchen
  kind(
    'kitchen_counter',
    'kitchen',
    'Counter',
    'floor',
    [width(1.8, 0.6, 4), depth(0.62, 0.5, 0.8), height(0.9, 0.8, 1)],
    { body: SCANDI.offWhite, top: SCANDI.oak },
    { body: 'matte', top: 'wood' },
  ),
  kind(
    'kitchen_island',
    'kitchen',
    'Island',
    'floor',
    [width(1.8, 1, 3), depth(0.9, 0.7, 1.2), height(0.92, 0.8, 1.1)],
    { body: SCANDI.sage, top: SCANDI.oak },
    { body: 'matte', top: 'wood' },
  ),
  kind(
    'upper_cabinets',
    'kitchen',
    'Upper cabinets',
    'wall',
    [width(1.6, 0.6, 3.5), depth(0.35, 0.25, 0.45), height(1.5, 1.2, 2)],
    { body: SCANDI.offWhite },
    { body: 'matte' },
  ),
  kind(
    'fridge',
    'kitchen',
    'Fridge',
    'floor',
    [width(0.6, 0.5, 0.95), depth(0.65, 0.5, 0.8), height(1.85, 0.8, 2.1)],
    applianceBody,
    applianceMat,
    TOGGLE,
  ),
  kind(
    'oven',
    'kitchen',
    'Oven',
    'floor',
    [width(0.6, 0.5, 0.9), depth(0.6, 0.5, 0.7), height(0.88, 0.6, 1)],
    applianceBody,
    applianceMat,
    TOGGLE,
  ),
  kind(
    'hob',
    'kitchen',
    'Hob',
    'floor',
    [width(0.6, 0.4, 0.9), depth(0.52, 0.4, 0.7), lift(0.9)],
    { body: SCANDI.charcoal, trim: SCANDI.slate },
    { body: 'ceramic', trim: 'metal' },
    TOGGLE,
  ),
  kind(
    'extractor_hood',
    'kitchen',
    'Extractor hood',
    'ceiling',
    [width(0.7, 0.5, 1.2), depth(0.45, 0.35, 0.6)],
    { body: SCANDI.offWhite, trim: SCANDI.slate },
    { body: 'metal', trim: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'dishwasher',
    'kitchen',
    'Dishwasher',
    'floor',
    [width(0.6, 0.45, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 0.95)],
    applianceBody,
    applianceMat,
    TOGGLE,
  ),
  kind(
    'kitchen_sink',
    'kitchen',
    'Sink',
    'floor',
    [width(0.55, 0.4, 0.9), depth(0.45, 0.35, 0.6), lift(0.9)],
    { body: SCANDI.slate, trim: SCANDI.offWhite },
    { body: 'metal', trim: 'ceramic' },
  ),
  kind(
    'microwave',
    'kitchen',
    'Microwave',
    'floor',
    [width(0.5, 0.35, 0.7), depth(0.38, 0.3, 0.5), lift(1.2)],
    applianceBody,
    applianceMat,
    TOGGLE,
  ),
  kind(
    'coffee_machine',
    'kitchen',
    'Coffee machine',
    'floor',
    [size(0.22, 0.15, 0.35), height(0.34, 0.25, 0.5), lift(0.92)],
    { body: SCANDI.charcoal, trim: SCANDI.oak },
    { body: 'matte', trim: 'wood' },
    TOGGLE,
  ),
  kind(
    'kettle',
    'kitchen',
    'Kettle',
    'floor',
    [size(0.16, 0.1, 0.25), lift(0.92)],
    { body: SCANDI.offWhite, trim: SCANDI.oak },
    { body: 'ceramic', trim: 'wood' },
    TOGGLE,
  ),

  // Laundry
  kind(
    'washing_machine',
    'laundry',
    'Washing machine',
    'floor',
    [width(0.6, 0.5, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 1)],
    applianceBody,
    applianceMat,
    TOGGLE_LEVEL,
  ),
  kind(
    'dryer',
    'laundry',
    'Dryer',
    'floor',
    [width(0.6, 0.5, 0.8), depth(0.6, 0.5, 0.7), height(0.85, 0.7, 1), lift(0)],
    applianceBody,
    applianceMat,
    TOGGLE_LEVEL,
  ),

  // Bathroom
  kind(
    'toilet',
    'bathroom',
    'Toilet',
    'floor',
    [width(0.38, 0.3, 0.5), depth(0.68, 0.5, 0.85)],
    { body: SCANDI.offWhite, trim: SCANDI.oak },
    { body: 'ceramic', trim: 'wood' },
  ),
  kind(
    'basin',
    'bathroom',
    'Basin',
    'floor',
    [width(0.6, 0.4, 1.2), depth(0.45, 0.35, 0.6), height(0.85, 0.7, 0.95)],
    { body: SCANDI.offWhite, trim: SCANDI.oak },
    { body: 'ceramic', trim: 'wood' },
  ),
  kind(
    'bathtub',
    'bathroom',
    'Bathtub',
    'floor',
    [width(0.78, 0.6, 1), length(1.7, 1.3, 2, 0.05)],
    { body: SCANDI.offWhite, trim: SCANDI.slate },
    { body: 'ceramic', trim: 'metal' },
  ),
  kind(
    'shower',
    'bathroom',
    'Shower',
    'floor',
    [width(0.9, 0.7, 1.4), depth(0.9, 0.7, 1.4), height(2, 1.8, 2.3)],
    { body: SCANDI.offWhite, trim: SCANDI.slate },
    { body: 'ceramic', trim: 'metal' },
  ),
  kind(
    'towel_rail',
    'bathroom',
    'Towel rail',
    'wall',
    [width(0.6, 0.3, 1), height(1.2, 0.6, 1.8)],
    { body: SCANDI.slate, towel: SCANDI.linen },
    { body: 'metal', towel: 'fabric' },
    TOGGLE,
  ),

  // Decor
  kind(
    'rug',
    'decor',
    'Rug',
    'floor',
    [width(2, 0.6, 4), depth(1.4, 0.5, 3)],
    { body: SCANDI.linen, pattern: SCANDI.clay },
    { body: 'carpet', pattern: 'carpet' },
  ),
  kind(
    'plant_large',
    'decor',
    'Large plant',
    'floor',
    [size(0.6, 0.3, 1.2), height(1.3, 0.6, 2.2)],
    { pot: SCANDI.clay, leaves: SCANDI.leaf },
    { pot: 'ceramic', leaves: 'matte' },
  ),
  kind(
    'plant_small',
    'decor',
    'Small plant',
    'floor',
    [size(0.25, 0.12, 0.5), lift(0.75)],
    { pot: SCANDI.clay, leaves: SCANDI.leaf },
    { pot: 'ceramic', leaves: 'matte' },
  ),
  kind(
    'picture',
    'decor',
    'Picture',
    'wall',
    [width(0.5, 0.2, 1.4), height(1.6, 0.8, 2.3), p('ratio', 'Height ratio', 1.3, 0.5, 2, 0.05)],
    { frame: SCANDI.oak, art: SCANDI.sage },
    { frame: 'wood', art: 'matte' },
  ),
  kind(
    'wall_mirror',
    'decor',
    'Wall mirror',
    'wall',
    [size(0.7, 0.3, 1.3), height(1.6, 0.8, 2.3)],
    { frame: SCANDI.oak, mirror: SCANDI.mist },
    { frame: 'wood', mirror: 'metal' },
  ),
  kind(
    'wall_clock',
    'decor',
    'Wall clock',
    'wall',
    [size(0.3, 0.15, 0.6), height(1.9, 1, 2.4)],
    { frame: SCANDI.oak, face: SCANDI.offWhite },
    { frame: 'wood', face: 'matte' },
  ),
  kind(
    'vase',
    'decor',
    'Vase',
    'floor',
    [size(0.18, 0.08, 0.4), height(0.3, 0.12, 0.7), lift(0.75)],
    { body: SCANDI.mist, stems: SCANDI.leaf },
    { body: 'ceramic', stems: 'matte' },
  ),
  kind(
    'books',
    'decor',
    'Books',
    'floor',
    [width(0.26, 0.12, 0.5), height(0.14, 0.06, 0.3), lift(0.75)],
    { body: SCANDI.clay },
    { body: 'matte' },
  ),
  kind(
    'basket',
    'decor',
    'Basket',
    'floor',
    [size(0.4, 0.2, 0.7), height(0.36, 0.2, 0.6)],
    { body: SCANDI.straw },
    { body: 'fabric' },
  ),
  kind(
    'curtain',
    'decor',
    'Curtain',
    'wall',
    [width(1.4, 0.6, 3), height(2.3, 1.2, 2.6)],
    { body: SCANDI.linen, rail: SCANDI.slate },
    { body: 'fabric', rail: 'metal' },
    TOGGLE_LEVEL,
  ),

  // Media
  kind(
    'tv',
    'media',
    'TV',
    'floor',
    [inches(60, 24, 110), lift(0)],
    { body: SCANDI.ink, screen: SCREEN_OFF_COLOR, stand: SCANDI.oak },
    { body: 'matte', screen: 'ceramic', stand: 'wood' },
    TOGGLE,
  ),
  kind(
    'tv_wall',
    'media',
    'Wall TV',
    'wall',
    [inches(60, 24, 110), height(1.3, 0.8, 2)],
    { body: SCANDI.ink, screen: SCREEN_OFF_COLOR },
    { body: 'matte', screen: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'soundbar',
    'media',
    'Soundbar',
    'floor',
    [width(0.9, 0.4, 1.6), height(0.08, 0.05, 0.15), lift(0)],
    { body: SCANDI.linen, trim: SCANDI.charcoal },
    { body: 'fabric', trim: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'speaker',
    'media',
    'Speaker',
    'floor',
    [size(0.16, 0.08, 0.35), height(0.22, 0.1, 0.5), lift(0)],
    { body: SCANDI.linen, trim: SCANDI.oak },
    { body: 'fabric', trim: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'floor_speaker',
    'media',
    'Floor speaker',
    'floor',
    [width(0.22, 0.15, 0.4), height(1, 0.6, 1.3)],
    { body: SCANDI.linen, trim: SCANDI.oak },
    { body: 'fabric', trim: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'monitor',
    'media',
    'Monitor',
    'floor',
    [width(0.6, 0.4, 1.1), p('ratio', 'Height ratio', 0.6, 0.4, 0.8, 0.02), lift(0)],
    { body: SCANDI.ink, screen: SCREEN_OFF_COLOR, stand: SCANDI.slate },
    { body: 'matte', screen: 'ceramic', stand: 'metal' },
    TOGGLE,
  ),
  kind(
    'game_console',
    'media',
    'Game console',
    'floor',
    [width(0.3, 0.15, 0.5), height(0.06, 0.04, 0.12), lift(0)],
    { body: SCANDI.offWhite, trim: SCANDI.charcoal },
    { body: 'matte', trim: 'matte' },
    TOGGLE,
  ),
  kind(
    'projector',
    'media',
    'Projector',
    'ceiling',
    [size(0.26, 0.15, 0.45)],
    { body: SCANDI.offWhite, trim: SCANDI.slate },
    { body: 'matte', trim: 'metal' },
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
    { body: SCANDI.offWhite },
    { body: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'ac_unit',
    'climate',
    'Air conditioner',
    'wall',
    [width(0.9, 0.6, 1.3), height(2.1, 1.5, 2.5)],
    { body: SCANDI.offWhite, trim: SCANDI.mist },
    { body: 'matte', trim: 'ceramic' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_ceiling',
    'climate',
    'Ceiling fan',
    'ceiling',
    [size(1.1, 0.6, 1.6), p('drop', 'Drop', 0.35, 0.1, 1)],
    { body: SCANDI.offWhite, blade: SCANDI.oak },
    { body: 'matte', blade: 'wood' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_standing',
    'climate',
    'Standing fan',
    'floor',
    [size(0.4, 0.25, 0.6), height(1.2, 0.7, 1.6)],
    { body: SCANDI.offWhite, blade: SCANDI.mist },
    { body: 'matte', blade: 'matte' },
    TOGGLE_LEVEL,
  ),
  kind(
    'fan_tower',
    'climate',
    'Tower fan',
    'floor',
    [size(0.24, 0.15, 0.4), height(1, 0.6, 1.4)],
    { body: SCANDI.offWhite, trim: SCANDI.slate },
    { body: 'matte', trim: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'air_purifier',
    'climate',
    'Air purifier',
    'floor',
    [size(0.28, 0.18, 0.45), height(0.6, 0.35, 0.9)],
    { body: SCANDI.offWhite, trim: SCANDI.linen },
    { body: 'matte', trim: 'fabric' },
    TOGGLE_LEVEL,
  ),
  kind(
    'humidifier',
    'climate',
    'Humidifier',
    'floor',
    [size(0.2, 0.12, 0.35), height(0.32, 0.2, 0.5), lift(0)],
    { body: SCANDI.offWhite, trim: SCANDI.mist },
    { body: 'ceramic', trim: 'ceramic' },
    TOGGLE_LEVEL,
  ),
  kind(
    'thermostat',
    'climate',
    'Thermostat',
    'wall',
    [size(0.11, 0.07, 0.2), height(1.45, 0.8, 2)],
    { body: SCANDI.offWhite, face: SCANDI.charcoal },
    { body: 'matte', face: 'ceramic' },
    READOUT,
  ),

  // Covers
  kind(
    'blind',
    'cover',
    'Blind',
    'wall',
    [width(1.2, 0.5, 3), height(2.1, 1, 2.5), p('drop', 'Drop', 1.4, 0.3, 2.2)],
    { body: SCANDI.linen, rail: SCANDI.slate },
    { body: 'fabric', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'roller_shutter',
    'cover',
    'Roller shutter',
    'wall',
    [width(1.2, 0.5, 3), height(2.1, 1, 2.5), p('drop', 'Drop', 1.4, 0.3, 2.2)],
    { body: SCANDI.mist, rail: SCANDI.slate },
    { body: 'metal', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'window',
    'cover',
    'Window',
    'wall',
    [width(1.2, 0.5, 3), height(1.2, 0.5, 2), p('sill', 'Sill height', 0.9, 0, 1.6)],
    { frame: SCANDI.offWhite, glass: SCANDI.mist },
    { frame: 'matte', glass: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'door',
    'cover',
    'Door',
    'wall',
    [width(0.85, 0.6, 1.4), height(2.05, 1.8, 2.4)],
    { body: SCANDI.offWhite, trim: SCANDI.oak },
    { body: 'matte', trim: 'wood' },
    TOGGLE,
  ),
  kind(
    'sliding_door',
    'cover',
    'Sliding door',
    'wall',
    [width(1.8, 0.9, 5), height(2.1, 1.8, 2.5), panels()],
    { body: SCANDI.offWhite, frame: SCANDI.slate },
    { body: 'matte', frame: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'sliding_glass',
    'cover',
    'Sliding glass door',
    'wall',
    [width(2.4, 1.2, 6), height(2.2, 1.8, 2.6), panels()],
    { frame: SCANDI.slate, glass: SCANDI.mist },
    { frame: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'garage_door',
    'cover',
    'Garage door',
    'wall',
    [width(2.5, 1.8, 4), height(2.2, 1.8, 2.6)],
    { body: SCANDI.mist, rail: SCANDI.slate },
    { body: 'metal', rail: 'metal' },
    TOGGLE_LEVEL,
  ),
  kind(
    'awning',
    'cover',
    'Awning',
    'wall',
    [width(2, 1, 4), height(2.3, 1.8, 2.6), p('drop', 'Extension', 1, 0.3, 2)],
    { body: SCANDI.linen, rail: SCANDI.slate },
    { body: 'fabric', rail: 'metal' },
    TOGGLE_LEVEL,
  ),

  // Security and sensors
  kind(
    'camera',
    'security',
    'Camera',
    'wall',
    [size(0.1, 0.06, 0.2), height(2.2, 1.2, 2.5)],
    { body: SCANDI.offWhite, lens: SCANDI.charcoal },
    { body: 'matte', lens: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'doorbell',
    'security',
    'Doorbell',
    'wall',
    [size(0.07, 0.04, 0.14), height(1.4, 0.9, 1.8)],
    { body: SCANDI.slate, face: SCANDI.charcoal },
    { body: 'metal', face: 'ceramic' },
    TOGGLE,
  ),
  kind(
    'motion_sensor',
    'security',
    'Motion sensor',
    'wall',
    [size(0.07, 0.04, 0.14), height(2.3, 1.2, 2.5)],
    { body: SCANDI.offWhite },
    { body: 'matte' },
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
    { body: SCANDI.offWhite },
    { body: 'matte' },
    TOGGLE,
  ),
  kind(
    'alarm_panel',
    'security',
    'Alarm panel',
    'wall',
    [size(0.16, 0.1, 0.3), height(1.5, 0.9, 2)],
    { body: SCANDI.offWhite, face: SCANDI.charcoal },
    { body: 'matte', face: 'ceramic' },
    READOUT,
  ),
  kind(
    'smart_lock',
    'security',
    'Smart lock',
    'wall',
    [size(0.09, 0.05, 0.16), height(1.05, 0.7, 1.4)],
    { body: SCANDI.slate },
    { body: 'metal' },
    TOGGLE,
  ),
  kind(
    'air_quality',
    'security',
    'Air quality sensor',
    'floor',
    [size(0.1, 0.06, 0.2), lift(0)],
    { body: SCANDI.offWhite, face: SCANDI.mist },
    { body: 'matte', face: 'ceramic' },
    READOUT,
  ),

  // Utility
  kind(
    'vacuum_robot',
    'utility',
    'Robot vacuum',
    'floor',
    [size(0.35, 0.25, 0.45)],
    { body: SCANDI.offWhite, trim: SCANDI.charcoal },
    { body: 'matte', trim: 'matte' },
    TOGGLE,
  ),
  kind(
    'smart_plug',
    'utility',
    'Smart plug',
    'wall',
    [size(0.07, 0.04, 0.12), height(0.3, 0.1, 1.4)],
    { body: SCANDI.offWhite },
    { body: 'matte' },
    TOGGLE,
  ),
  kind(
    'switch_panel',
    'utility',
    'Switch panel',
    'wall',
    [size(0.09, 0.06, 0.16), height(1.1, 0.8, 1.5)],
    { body: SCANDI.offWhite, face: SCANDI.linen },
    { body: 'matte', face: 'matte' },
    TOGGLE,
  ),
]

export const decorationKind = (id: string) => DECORATION_KINDS.find(k => k.id === id)

export function paramValue(kind: DecorationKind, params: Record<string, number> | undefined, id: string) {
  return params?.[id] ?? kind.params.find(p => p.id === id)?.default ?? 0
}

export function colorValue(kind: DecorationKind, colors: Record<string, string> | undefined, slot: string) {
  return colors?.[slot] ?? kind.colors[slot] ?? '#ffffff'
}

export function materialValue(kind: DecorationKind, materials: Record<string, string> | undefined, slot: string) {
  return materials?.[slot] ?? kind.materials?.[slot] ?? 'matte'
}

// Footprint on the plan, for the 2D editor.
// A screen's diagonal in inches as its width and height in meters, always
// in 16:9.
export function screenSize(inches: number): [number, number] {
  const diagonal = inches * 0.0254
  return [(diagonal * 16) / Math.hypot(16, 9), (diagonal * 9) / Math.hypot(16, 9)]
}

export function footprint(kind: DecorationKind, params: Record<string, number> | undefined): [number, number] {
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

// Material slots that are what they are: the viewer picks their tint, never
// their surface.
export const FIXED_SLOTS = new Set(['glass', 'mirror'])

// Items with a flat top that other things can stand on, and how high that
// top is: their own height parameter, or a fixed height when they have none.
const SURFACE_TOPS: Record<string, string | number> = {
  dining_table: 'height',
  coffee_table: 'height',
  side_table: 'height',
  desk: 'height',
  console_table: 'height',
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
export function surfaceRect(
  kind: DecorationKind,
  params: Record<string, number> | undefined,
): [number, number] {
  const [w, d] = footprint(kind, params)
  return [Math.max(w - 0.1, w * 0.4), Math.max(d - 0.1, d * 0.4)]
}
