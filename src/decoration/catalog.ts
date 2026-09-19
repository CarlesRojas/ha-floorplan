import type { Signal } from '#/signals.ts'
import { LIGHT_BASE_COLOR, LIGHT_CORD_COLOR, LIGHT_SHADE_COLOR } from '#/theme.ts'

export type Mount = 'floor' | 'wall' | 'ceiling'

export type DecorationParam = {
  id: string
  label: string
  default: number
  min: number
  max: number
  step: number
}

export type DecorationKind = {
  id: string
  family: string
  label: string
  mount: Mount
  params: DecorationParam[]
  // Material slots and their default colors.
  colors: Record<string, string>
  // Signals the model can express visually. Anything else can still be
  // bound, the model just does not change.
  expresses: Signal[]
}

const lightColors = { shade: LIGHT_SHADE_COLOR, base: LIGHT_BASE_COLOR }
const LIGHT_SIGNALS: Signal[] = ['toggle', 'level', 'color', 'warmth']
const size = (d: number, min = 0.1, max = 1.5): DecorationParam => ({
  id: 'size',
  label: 'Size',
  default: d,
  min,
  max,
  step: 0.05,
})

export const DECORATION_KINDS: DecorationKind[] = [
  {
    id: 'light_ceiling',
    family: 'light',
    label: 'Ceiling light',
    mount: 'ceiling',
    params: [size(0.45, 0.2, 1.2)],
    colors: lightColors,
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_pendant',
    family: 'light',
    label: 'Pendant',
    mount: 'ceiling',
    params: [size(0.4, 0.15, 1), { id: 'cord', label: 'Cord length', default: 0.8, min: 0.2, max: 2, step: 0.05 }],
    colors: { ...lightColors, cord: LIGHT_CORD_COLOR },
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_floor',
    family: 'light',
    label: 'Floor lamp',
    mount: 'floor',
    params: [size(0.4, 0.2, 0.8), { id: 'height', label: 'Height', default: 1.5, min: 0.8, max: 2.2, step: 0.05 }],
    colors: lightColors,
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_table',
    family: 'light',
    label: 'Table lamp',
    mount: 'floor',
    params: [
      size(0.3, 0.15, 0.6),
      { id: 'height', label: 'Height', default: 0.45, min: 0.2, max: 0.9, step: 0.05 },
      { id: 'lift', label: 'Standing on', default: 0.75, min: 0, max: 1.5, step: 0.05 },
    ],
    colors: lightColors,
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_wall',
    family: 'light',
    label: 'Wall light',
    mount: 'wall',
    params: [size(0.25, 0.1, 0.6), { id: 'height', label: 'Height', default: 1.8, min: 0.5, max: 2.5, step: 0.05 }],
    colors: lightColors,
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_strip',
    family: 'light',
    label: 'LED strip',
    mount: 'floor',
    params: [
      { id: 'length', label: 'Length', default: 1, min: 0.2, max: 10, step: 0.1 },
      { id: 'height', label: 'Height', default: 0.02, min: 0, max: 2.6, step: 0.05 },
    ],
    colors: { base: LIGHT_BASE_COLOR },
    expresses: LIGHT_SIGNALS,
  },
  {
    id: 'light_spot',
    family: 'light',
    label: 'Spot',
    mount: 'ceiling',
    params: [size(0.12, 0.06, 0.3)],
    colors: { base: LIGHT_BASE_COLOR },
    expresses: LIGHT_SIGNALS,
  },
]

export const decorationKind = (id: string) => DECORATION_KINDS.find(k => k.id === id)

export function paramValue(kind: DecorationKind, params: Record<string, number> | undefined, id: string) {
  return params?.[id] ?? kind.params.find(p => p.id === id)?.default ?? 0
}

export function colorValue(kind: DecorationKind, colors: Record<string, string> | undefined, slot: string) {
  return colors?.[slot] ?? kind.colors[slot] ?? '#ffffff'
}
