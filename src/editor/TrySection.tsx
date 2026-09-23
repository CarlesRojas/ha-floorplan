import { itemLevels, type DecorationKind } from '#/decoration/catalog.ts'
import { Switch } from '#/editor/panel.tsx'
import {
  initialTry,
  isPositioned,
  KELVIN_MAX,
  KELVIN_MIN,
  WARM_WHITE_K,
  type Tint,
  type TryState,
} from '#/editor/tryState.ts'
import { cn } from '#/lib/utils.ts'

type Props = {
  kind: DecorationKind
  state: TryState | undefined
  accent: string
  onChange: (state: TryState | null) => void
}

// What the switch is called on each piece, where "on" would read oddly.
const SWITCH_LABELS: Record<string, string> = {
  door: 'Open',
  smart_lock: 'Locked',
  vacuum_robot: 'Running',
}

const TINTS: { mode: Tint['mode'] | 'default'; label: string }[] = [
  { mode: 'default', label: 'Default' },
  { mode: 'white', label: 'White' },
  { mode: 'color', label: 'Color' },
]

// The states a piece with no device can be tried in, one control for each
// thing it shows: a switch for on and off, a slider for each level, and a
// light's color. Only for the editor; nothing here is saved.
export default function TrySection({ kind, state, accent, onChange }: Props) {
  const s = state ?? initialTry(kind)
  const levels = itemLevels(kind)
  const positioned = isPositioned(kind) && levels.some(l => l.id === 'open')
  const isLight = kind.expresses.includes('color') || kind.expresses.includes('warmth')
  const set = (patch: Partial<TryState>) => onChange({ ...s, ...patch })
  const tintMode = s.tint?.mode ?? 'default'

  return (
    <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-(--secondary-text-color)">Try its states</p>
        {state && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded px-1.5 text-xs text-(--secondary-text-color) hover:text-(--primary-text-color)"
          >
            Reset
          </button>
        )}
      </div>
      {/* A positioned piece is as open as its slider says, so its switch
          would only repeat it. */}
      {!positioned && (
        <label className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
          {SWITCH_LABELS[kind.id] ?? 'On'}
          <Switch checked={s.on} accent={accent} label={SWITCH_LABELS[kind.id] ?? 'On'} onChange={on => set({ on })} />
        </label>
      )}
      {levels.map(level => {
        const value = s.levels[level.id] ?? 0
        const label = isLight ? 'Brightness' : level.label
        return (
          <label key={level.id} className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
            {label}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={value}
              aria-label={label}
              style={{ accentColor: accent }}
              onChange={e => set({ levels: { ...s.levels, [level.id]: Number(e.target.value) } })}
            />
            <span className="text-right text-xs text-(--secondary-text-color)">{Math.round(value * 100)}%</span>
          </label>
        )
      })}
      {isLight && (
        <>
          <div className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
            Light
            <div className="flex rounded-lg border border-(--divider-color) p-0.5">
              {TINTS.map(t => (
                <button
                  key={t.mode}
                  type="button"
                  aria-pressed={tintMode === t.mode}
                  onClick={() =>
                    set({
                      tint:
                        t.mode === 'default'
                          ? undefined
                          : t.mode === 'white'
                            ? { mode: 'white', kelvin: WARM_WHITE_K }
                            : { mode: 'color', hex: '#ff4fa0' },
                    })
                  }
                  className={cn(
                    'flex-1 rounded-md py-1 text-xs font-semibold',
                    tintMode === t.mode ? 'text-black' : 'text-(--secondary-text-color)',
                  )}
                  style={tintMode === t.mode ? { backgroundColor: accent } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {s.tint?.mode === 'white' && (
            <label className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
              Warmth
              <input
                type="range"
                min={KELVIN_MIN}
                max={KELVIN_MAX}
                step={100}
                value={s.tint.kelvin}
                aria-label="Warmth"
                style={{ accentColor: accent }}
                onChange={e => set({ tint: { mode: 'white', kelvin: Number(e.target.value) } })}
              />
              <span className="text-right text-xs text-(--secondary-text-color)">{s.tint.kelvin} K</span>
            </label>
          )}
          {s.tint?.mode === 'color' && (
            <label className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
              Color
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-(--divider-color) bg-transparent"
                value={s.tint.hex}
                onChange={e => set({ tint: { mode: 'color', hex: e.target.value } })}
              />
            </label>
          )}
        </>
      )}
      <p className="text-xs text-(--secondary-text-color)">
        Clicking it in 3D switches it too. Only for the editor: none of this is saved.
      </p>
    </div>
  )
}
