import {
  canRide,
  DECORATION_KINDS,
  FIXED_SLOTS,
  decorationKind,
  isSupport,
  materialValue,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { ridersOf } from '#/decoration/surfaces.ts'
import { entityName } from '#/devices/catalog.ts'
import ModelPreview from '#/editor/ModelPreview.tsx'
import { PreviewHandle, SelectedHeader, Signals, Sticky } from '#/editor/panel.tsx'
import { EDITOR_SIDEBAR_PREVIEW_PX } from '#/constants.ts'
import { cn } from '#/lib/utils.ts'
import { DECORATION_MATERIALS, EDITOR_MODE_COLORS, ROOM_COLORS } from '#/theme.ts'
import type { DecorationConfig, DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { decorationIcon, FAMILY_LABELS } from '#/decoration/icons.ts'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  rooms: RoomConfig[]
  devices: DeviceConfig[]
  decorations: DecorationConfig[]
  selected: string | null
  onAdd: (kind: DecorationKind) => void
  onUpdate: (id: string, patch: Partial<DecorationConfig>) => void
  onRemove: (id: string) => void
  onBind: (id: string, entityId: string | null) => void
  onStandOn: (id: string, supportId: string | null) => void
  onSelect: (id: string | null) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'
const accent = EDITOR_MODE_COLORS.decoration

export default function DecorationPanel({
  hass,
  rooms,
  devices,
  decorations,
  selected,
  onAdd,
  onUpdate,
  onRemove,
  onBind,
  onStandOn,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState<DecorationKind | null>(null)
  const [query, setQuery] = useState('')
  const [previewHeight, setPreviewHeight] = useState(EDITOR_SIDEBAR_PREVIEW_PX)
  const item = selected ? decorations.find(d => d.id === selected) : undefined
  const kind = item ? decorationKind(item.kind) : undefined

  if (item && kind) {
    const boundDevice = devices.find(d => d.decorations?.includes(item.id))
    // Tops in the same room, never the item itself or anything on it.
    const mine = new Set([item.id, ...ridersOf(item.id, decorations).map(r => r.id)])
    const supports = decorations.filter(d => {
      if (mine.has(d.id) || d.room !== item.room) return false
      const k = decorationKind(d.kind)
      return k ? isSupport(k) : false
    })
    const itemRoom = rooms.find(r => r.id === item.room)
    const roomIndex = rooms.findIndex(r => r.id === item.room)
    const roomTag = itemRoom ? (
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-black"
        style={{ backgroundColor: itemRoom.color ?? ROOM_COLORS[roomIndex % ROOM_COLORS.length] }}
      >
        {itemRoom.name ?? itemRoom.id}
      </span>
    ) : undefined
    return (
      <div className="flex flex-col gap-3">
        <Sticky>
          <SelectedHeader title={kind.label} tag={roomTag} accent={accent} onBack={() => onSelect(null)} />
          <ModelPreview
            item={item}
            className="w-full overflow-hidden rounded-xl bg-(--secondary-background-color)"
            style={{ height: previewHeight }}
          />
          <PreviewHandle onDrag={dy => setPreviewHeight(h => Math.min(Math.max(h + dy, 120), 520))} />
          <Signals signals={kind.expresses} accent={accent} />
        </Sticky>

        {kind.params.map(p => {
          const value = item.params?.[p.id] ?? p.default
          return (
            <label key={p.id} className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
              {p.label}
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={value}
                style={{ accentColor: accent }}
                onChange={e => onUpdate(item.id, { params: { ...item.params, [p.id]: Number(e.target.value) } })}
              />
              <span className="text-right text-xs text-(--secondary-text-color)">
                {/* The parameter says its unit, and means meters when silent. */}
                {p.unit === undefined ? `${value.toFixed(2)} m` : `${value}${p.unit}`}
              </span>
            </label>
          )
        })}
        <label className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
          Rotation
          <input
            type="range"
            min={0}
            max={345}
            step={15}
            value={item.rotation ?? 0}
            style={{ accentColor: accent }}
            onChange={e => onUpdate(item.id, { rotation: Number(e.target.value) })}
          />
          <span className="text-right text-xs text-(--secondary-text-color)">{item.rotation ?? 0}°</span>
        </label>

        <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
          <p className="text-xs font-semibold text-(--secondary-text-color)">Materials</p>
          {Object.entries(kind.colors).map(([slot, fallback]) => (
            <div key={slot} className="grid grid-cols-[96px_1fr_40px] items-center gap-2 text-sm capitalize">
              {slot}
              {FIXED_SLOTS.has(slot) ? (
                // Glass is glass. Only its tint is up to the viewer.
                <span className="text-xs text-(--secondary-text-color)">Tint only</span>
              ) : (
                <select
                  className={input}
                  value={materialValue(kind, item.materials, slot)}
                  onChange={e => onUpdate(item.id, { materials: { ...item.materials, [slot]: e.target.value } })}
                >
                  {Object.entries(DECORATION_MATERIALS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-(--divider-color) bg-transparent"
                value={item.colors?.[slot] ?? fallback}
                onChange={e => onUpdate(item.id, { colors: { ...item.colors, [slot]: e.target.value } })}
              />
            </div>
          ))}
        </div>

        {canRide(kind) && (
          <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
            <p className="text-xs font-semibold text-(--secondary-text-color)">Standing on</p>
            <select
              className={input}
              value={item.on ?? ''}
              onChange={e => onStandOn(item.id, e.target.value || null)}
            >
              <option value="">The floor</option>
              {supports.map(s => (
                <option key={s.id} value={s.id}>
                  {decorationKind(s.kind)?.label ?? s.kind}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
          <p className="text-xs font-semibold text-(--secondary-text-color)">Device</p>
          <select
            className={input}
            value={boundDevice?.entity_id ?? ''}
            onChange={e => onBind(item.id, e.target.value || null)}
          >
            <option value="">None</option>
            {devices.map(d => (
              <option key={d.entity_id} value={d.entity_id}>
                {hass ? entityName(hass, d.entity_id) : d.entity_id}
              </option>
            ))}
          </select>
          <p className="text-xs text-(--secondary-text-color)">
            Clicking this item in 3D acts on the device, and double clicking opens the device's own dialog in Home
            Assistant, where brightness, color and the rest live.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="mt-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-(--divider-color) text-sm font-semibold text-(--error-color)"
        >
          <FontAwesomeIcon icon={faTrash} className="size-3.5" />
          Remove from plan
        </button>
      </div>
    )
  }

  const families = [...new Set(DECORATION_KINDS.map(k => k.family))]
  const previewItem: DecorationConfig | null = hovered
    ? { id: 'preview', kind: hovered.id, room: '', position: [0, 0] }
    : null

  return (
    <div className="flex flex-col gap-3">
      {rooms.length === 0 && (
        <p className="text-sm text-(--secondary-text-color)">Draw rooms in the Rooms mode first.</p>
      )}

      <Sticky>
        <div
          className="w-full overflow-hidden rounded-xl bg-(--secondary-background-color)"
          style={{ height: previewHeight }}
        >
          {previewItem ? (
            <ModelPreview item={previewItem} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-(--secondary-text-color)">
              Hover an item to preview it
            </div>
          )}
        </div>
        <PreviewHandle onDrag={dy => setPreviewHeight(h => Math.min(Math.max(h + dy, 120), 520))} />
        <input className={input} placeholder="Search items" value={query} onChange={e => setQuery(e.target.value)} />
      </Sticky>

      {families.map(family => {
        // A family name matches everything in it, so searching kitchen
        // lists the whole kitchen.
        const q = query.trim().toLowerCase()
        const familyMatch = !!q && (FAMILY_LABELS[family] ?? family).toLowerCase().includes(q)
        const shown = DECORATION_KINDS.filter(
          k => k.family === family && (!q || familyMatch || k.label.toLowerCase().includes(q)),
        )
        if (shown.length === 0) return null
        return (
          <div key={family} className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-(--secondary-text-color)">{FAMILY_LABELS[family] ?? family}</p>
            {shown.map(k => (
              <div
                key={k.id}
                onMouseEnter={() => setHovered(k)}
                onMouseLeave={() => setHovered(h => (h?.id === k.id ? null : h))}
                className={cn(
                  'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1',
                  hovered?.id === k.id && 'bg-(--secondary-background-color)',
                )}
              >
                <FontAwesomeIcon
                  icon={decorationIcon(k.id, k.family)}
                  className="size-4 text-(--secondary-text-color)"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm text-(--primary-text-color)">
                    <span className="truncate">{k.label}</span>
                    <Signals signals={k.expresses} size="sm" />
                  </p>
                  <p className="truncate text-xs text-(--secondary-text-color) capitalize">{k.mount}</p>
                </div>
                {rooms.length > 0 ? (
                  <button
                    type="button"
                    aria-label={`Add ${k.label}`}
                    onClick={() => onAdd(k)}
                    className="flex size-8 items-center justify-center rounded-lg hover:bg-(--card-background-color)"
                    style={{ color: accent }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="size-4" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
