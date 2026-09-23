import { itemLevels, type DecorationKind } from '#/decoration/catalog.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import { kelvinToRgb } from '#/signals.ts'
import { LIGHT_GLOW_COLOR } from '#/theme.ts'
import { Color, SRGBColorSpace } from 'three'

// States tried out in the editor, on pieces with no device behind them, so
// every look a piece has can be seen before anything drives it. They live in
// the editor only: nothing here is saved, and the card never sees them.

export type Tint = { mode: 'white'; kelvin: number } | { mode: 'color'; hex: string }

export type TryState = {
  on: boolean
  // 0 to 1, by the item's own level ids: open, tilt.
  levels: Record<string, number>
  // Lights only. Missing is the light's own warm glow, the one it shows
  // bound to a light that says nothing about its color.
  tint?: Tint
}

export type TryStates = Record<string, TryState>

// The warm white a light shows when nothing says otherwise.
export const WARM_WHITE_K = 2700
export const KELVIN_MIN = 2000
export const KELVIN_MAX = 6500

// Pieces whose percentage is where they are, not how hard they run: a blind
// is as open as its position says, whatever its switch. For these the switch
// and the position are one thing, as a cover's are in Home Assistant.
const POSITIONED_FAMILIES = new Set(['cover'])
const POSITIONED_KINDS = new Set(['curtain', 'projector_screen'])

export const isPositioned = (kind: DecorationKind) =>
  POSITIONED_FAMILIES.has(kind.family) || POSITIONED_KINDS.has(kind.id)

// Whether a piece has anything to try: more than the one look.
export const canTry = (kind: DecorationKind) => kind.expresses.length > 0 || itemLevels(kind).length > 0

// What a piece shows before it is touched: off, shut, at full level.
export function initialTry(kind: DecorationKind): TryState {
  const levels: Record<string, number> = {}
  for (const level of itemLevels(kind)) levels[level.id] = isPositioned(kind) ? 0 : 1
  return { on: false, levels }
}

// A click on the piece in 3D, the way a click on a bound one toggles its
// device. A positioned piece opens all the way or shuts.
export function toggleTry(kind: DecorationKind, state: TryState): TryState {
  if (!isPositioned(kind) || !('open' in state.levels)) return { ...state, on: !state.on }
  const open = state.levels.open > 0 ? 0 : 1
  return { ...state, on: open > 0, levels: { ...state.levels, open } }
}

const fromSrgb = (r: number, g: number, b: number): [number, number, number] => {
  const c = new Color().setRGB(r, g, b, SRGBColorSpace)
  return [c.r, c.g, c.b]
}

// What the model is handed, the same shape a device's state takes.
export function tryItemState(kind: DecorationKind, state: TryState): ItemState {
  const tint = state.tint
  let glow: [number, number, number]
  if (tint?.mode === 'white') glow = fromSrgb(...kelvinToRgb(tint.kelvin))
  else {
    // Hex colors are sRGB, and three turns them linear on the way in.
    const c = new Color(tint?.mode === 'color' ? tint.hex : LIGHT_GLOW_COLOR)
    glow = [c.r, c.g, c.b]
  }
  const positioned = isPositioned(kind) && 'open' in state.levels
  return {
    on: positioned ? state.levels.open > 0 : state.on,
    level: kind.expresses.includes('level') ? state.levels.open : undefined,
    levels: state.levels,
    glow,
  }
}
