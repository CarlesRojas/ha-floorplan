import { DECORATION_KINDS, decorationKind, materialValue, type DecorationKind } from '#/decoration/catalog.ts'
import { entityName } from '#/devices/catalog.ts'
import ModelPreview from '#/editor/ModelPreview.tsx'
import { cn } from '#/lib/utils.ts'
import { DECORATION_MATERIALS, EDITOR_MODE_COLORS, FLOOR_MATERIALS, ROOM_COLORS } from '#/theme.ts'
import type { DecorationConfig, DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { decorationIcon, FAMILY_LABELS } from '#/decoration/icons.ts'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  rooms: RoomConfig[]
  room: RoomConfig | null
  devices: DeviceConfig[]
  decorations: DecorationConfig[]
  selected: string | null
  onAdd: (kind: DecorationKind) => void
  onUpdate: (id: string, patch: Partial<DecorationConfig>) => void
  onRemove: (id: string) => void
  onBind: (id: string, entityId: string | null) => void
  onFloor: (roomId: string, floor: RoomConfig['floor']) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'
const accent = EDITOR_MODE_COLORS.decoration

export default function DecorationPanel({
  hass,
  rooms,
  room,
  devices,
  decorations,
  selected,
  onAdd,
  onUpdate,
  onRemove,
  onBind,
  onFloor,
}: Props) {
  const [hovered, setHovered] = useState<DecorationKind | null>(null)
  const [query, setQuery] = useState('')
  const item = selected ? decorations.find(d => d.id === selected) : undefined
  const kind = item ? decorationKind(item.kind) : undefined

  if (item && kind) {
    const boundDevice = devices.find(d => d.decorations?.includes(item.id))
    const itemRoom = rooms.find(r => r.id === item.room)
    const roomIndex = rooms.findIndex(r => r.id === item.room)
    return (
      <div className="flex flex-col gap-3">
        <ModelPreview
          item={item}
          className="h-56 w-full overflow-hidden rounded-xl bg-(--secondary-background-color)"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{kind.label}</p>
          {itemRoom && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-black"
              style={{ backgroundColor: itemRoom.color ?? ROOM_COLORS[roomIndex % ROOM_COLORS.length] }}
            >
              {itemRoom.name ?? itemRoom.id}
            </span>
          )}
        </div>

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
              <span className="text-right text-xs text-(--secondary-text-color)">{value.toFixed(2)} m</span>
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
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-(--divider-color) bg-transparent"
                value={item.colors?.[slot] ?? fallback}
                onChange={e => onUpdate(item.id, { colors: { ...item.colors, [slot]: e.target.value } })}
              />
            </div>
          ))}
        </div>

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
            Clicking this item in 3D acts on the device. It lights up when the device has an on state.
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
      {room ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{room.name ?? room.id}</p>
          <label className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
            Floor
            <select
              className={input}
              value={room.floor?.material ?? ''}
              onChange={e => onFloor(room.id, e.target.value ? { material: e.target.value } : undefined)}
            >
              <option value="">Room color</option>
              {Object.entries(FLOOR_MATERIALS).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          {room.floor && (
            <>
              <label className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
                Tint
                <input
                  type="color"
                  className="h-8 w-full cursor-pointer rounded border border-(--divider-color) bg-transparent"
                  value={room.floor.color ?? FLOOR_MATERIALS[room.floor.material]?.color ?? '#ffffff'}
                  onChange={e => onFloor(room.id, { ...room.floor!, color: e.target.value })}
                />
              </label>
              <label className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
                Pattern size
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={room.floor.scale ?? 1}
                  style={{ accentColor: accent }}
                  onChange={e => onFloor(room.id, { ...room.floor!, scale: Number(e.target.value) })}
                />
                <span className="text-right text-xs text-(--secondary-text-color)">
                  {(room.floor.scale ?? 1).toFixed(2)}x
                </span>
              </label>
              <label className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-sm">
                Pattern angle
                <input
                  type="range"
                  min={0}
                  max={175}
                  step={5}
                  value={room.floor.rotation ?? 0}
                  style={{ accentColor: accent }}
                  onChange={e => onFloor(room.id, { ...room.floor!, rotation: Number(e.target.value) })}
                />
                <span className="text-right text-xs text-(--secondary-text-color)">{room.floor.rotation ?? 0}°</span>
              </label>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-(--secondary-text-color)">
          {rooms.length === 0 ? 'Draw rooms in the Rooms mode first.' : 'Pick a room on the canvas, or add and drag.'}
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-1 bg-(--card-background-color) px-1 pb-2">
        <div className="h-44 w-full overflow-hidden rounded-xl bg-(--secondary-background-color)">
          {previewItem ? (
            <ModelPreview item={previewItem} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-(--secondary-text-color)">
              Hover an item to preview it
            </div>
          )}
        </div>
      </div>

      <input className={input} placeholder="Search items" value={query} onChange={e => setQuery(e.target.value)} />

      {families.map(family => {
        const shown = DECORATION_KINDS.filter(
          k => k.family === family && (!query.trim() || k.label.toLowerCase().includes(query.trim().toLowerCase())),
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
                  <p className="truncate text-sm text-(--primary-text-color)">{k.label}</p>
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
