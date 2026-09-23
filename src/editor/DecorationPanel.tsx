import {
  canRide,
  DECORATION_KINDS,
  decorationKind,
  isSupport,
  itemLevels,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { ridersOf } from '#/decoration/surfaces.ts'
import { placeableEntities } from '#/devices/catalog.ts'
import ModelPreview from '#/editor/ModelPreview.tsx'
import { PreviewHandle, SelectedHeader, Signals, Sticky } from '#/editor/panel.tsx'
import { Select } from '#/components/ui/select.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { cn } from '#/lib/utils.ts'
import { deviceSignals, levelChannels } from '#/signals.ts'
import { EDITOR_ACCENT_COLOR, EDITOR_BOUND_COLOR, ROOM_COLORS } from '#/theme.ts'
import type { DecorationConfig, DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { decorationIcon, FAMILY_LABELS } from '#/decoration/icons.ts'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { useResizeObserver } from 'usehooks-ts'

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
  onDeviceLevels: (entityId: string, levels: Record<string, string>) => void
  onStandOn: (id: string, supportId: string | null) => void
  onSelect: (id: string | null) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'
const accent = EDITOR_ACCENT_COLOR

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
  onDeviceLevels,
  onStandOn,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState<DecorationKind | null>(null)
  const [query, setQuery] = useState('')
  // Null until the handle is dragged: the preview is square by default, so
  // it takes the shape of the sidebar it sits in.
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const previewBox = useRef<HTMLDivElement>(null)
  const { width: previewWidth = 0 } = useResizeObserver({
    ref: previewBox as unknown as React.RefObject<HTMLElement>,
    box: 'border-box',
  })
  const square = Math.max(previewWidth, 120)
  const height = previewHeight ?? square
  const resize = (dy: number) => setPreviewHeight(h => Math.min(Math.max((h ?? square) + dy, 120), 520))
  // The item a trash icon in the device's list was clicked on, waiting for
  // the yes.
  const [unbinding, setUnbinding] = useState<DecorationConfig | null>(null)
  const item = selected ? decorations.find(d => d.id === selected) : undefined
  const kind = item ? decorationKind(item.kind) : undefined

  if (item && kind) {
    const boundDevice = devices.find(d => d.decorations?.includes(item.id))
    const boundSignals = hass && boundDevice ? deviceSignals(hass, boundDevice.entity_id) : []
    const channels = hass && boundDevice ? levelChannels(hass, boundDevice.entity_id) : []
    // The other pieces the same device stands behind, so what it drives can
    // be seen and let go of from here.
    const siblings = (boundDevice?.decorations ?? [])
      .filter(id => id !== item.id)
      .map(id => decorations.find(d => d.id === id))
      .filter((d): d is DecorationConfig => !!d)
    // Entities that drive at least one of the things this item can show,
    // the ones that fit best first. A device can stand behind several
    // pieces at once, so one already in use is still on offer.
    const shared = (entityId: string) =>
      hass ? deviceSignals(hass, entityId).filter(x => kind.expresses.includes(x)).length : 0
    const fits = (hass ? placeableEntities(hass) : [])
      .filter(e => shared(e.entity_id) > 0)
      .sort((a, b) => shared(b.entity_id) - shared(a.entity_id) || a.name.localeCompare(b.name))
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
          <div ref={previewBox}>
            <ModelPreview
              item={item}
              className="w-full overflow-hidden rounded-xl bg-(--secondary-background-color)"
              style={{ height }}
            />
          </div>
          <PreviewHandle onDrag={resize} />
          <Signals signals={kind.expresses} accent={accent} />
        </Sticky>

        {kind.params.map(p => {
          const value = item.params?.[p.id] ?? p.default
          // A two state parameter is a switch, not a slider with two stops.
          if (p.toggle)
            return (
              <label key={p.id} className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
                {p.label}
                <input
                  type="checkbox"
                  className="h-4 w-4 justify-self-start"
                  checked={value > 0.5}
                  style={{ accentColor: accent }}
                  onChange={e => onUpdate(item.id, { params: { ...item.params, [p.id]: e.target.checked ? 1 : 0 } })}
                />
              </label>
            )
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

        {/* The surface of each part is part of what the piece is. Only its
            color is the viewer's to pick. */}
        <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
          <p className="text-xs font-semibold text-(--secondary-text-color)">Colors</p>
          {Object.entries(kind.colors).map(([slot, fallback]) => (
            <label key={slot} className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm capitalize">
              {slot}
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-(--divider-color) bg-transparent"
                value={item.colors?.[slot] ?? fallback}
                onChange={e => onUpdate(item.id, { colors: { ...item.colors, [slot]: e.target.value } })}
              />
            </label>
          ))}
        </div>

        {canRide(kind) && (
          <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
            <p className="text-xs font-semibold text-(--secondary-text-color)">Standing on</p>
            <Select
              aria-label="Standing on"
              value={item.on ?? ''}
              placeholder="The floor"
              options={[
                { value: '', label: 'The floor' },
                ...supports.map(s => ({ value: s.id, label: decorationKind(s.kind)?.label ?? s.kind })),
              ]}
              onChange={v => onStandOn(item.id, v || null)}
            />
          </div>
        )}

        {/* What in Home Assistant this piece stands for. Only entities that
            can drive at least one thing the item does are on offer, each
            listed with the controls it brings. */}
        <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
          <p className="text-xs font-semibold text-(--secondary-text-color)">Device</p>
          {kind.expresses.length === 0 ? (
            <p className="text-xs text-(--secondary-text-color)">
              This item shows nothing a device could drive, so it stands for nothing.
            </p>
          ) : (
            <>
              <Select
                aria-label="Device"
                value={boundDevice?.entity_id ?? ''}
                style={boundDevice ? { borderColor: EDITOR_BOUND_COLOR } : undefined}
                options={[
                  { value: '', label: 'None' },
                  // Each entity says what it brings in words, since an icon
                  // alone does not tell you what a device can drive.
                  ...fits.map(e => ({
                    value: e.entity_id,
                    label: e.name,
                    detail: hass ? (
                      <Signals signals={deviceSignals(hass, e.entity_id)} accent={EDITOR_BOUND_COLOR} />
                    ) : undefined,
                  })),
                ]}
                onChange={v => onBind(item.id, v || null)}
              />
              {fits.length === 0 && (
                <p className="text-xs text-(--secondary-text-color)">
                  Nothing in Home Assistant drives what this item shows.
                </p>
              )}
              {boundDevice && (
                <>
                  <Signals signals={boundSignals} accent={EDITOR_BOUND_COLOR} />
                  {/* Which of the device's percentages drives each of the
                      item's: how far it opens, how far it tilts. Only worth
                      asking when there is a choice to make. */}
                  {channels.length > 0 &&
                    (channels.length > 1 || itemLevels(kind).length > 1) &&
                    itemLevels(kind).map(level => (
                      <label key={level.id} className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
                        {level.label}
                        <Select
                          aria-label={level.label}
                          value={boundDevice.levels?.[level.id] ?? ''}
                          options={[
                            {
                              value: '',
                              label: level.id === 'tilt' ? 'None' : (channels[0]?.label ?? 'None'),
                            },
                            ...channels.map(ch => ({ value: ch.id, label: ch.label })),
                          ]}
                          onChange={v =>
                            onDeviceLevels(boundDevice.entity_id, { ...boundDevice.levels, [level.id]: v })
                          }
                        />
                      </label>
                    ))}
                  {/* The other pieces this same device drives. A row goes to
                      that piece, the bin lets go of it. */}
                  {siblings.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-(--secondary-text-color)">Also driving</p>
                      {siblings.map(other => {
                        const k = decorationKind(other.kind)
                        const room = rooms.find(r => r.id === other.room)
                        return (
                          <div key={other.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSelect(other.id)}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-(--secondary-background-color)"
                            >
                              <FontAwesomeIcon
                                icon={decorationIcon(other.kind, k?.family ?? 'decor')}
                                className="size-3.5 shrink-0 text-(--secondary-text-color)"
                              />
                              <span className="min-w-0 flex-1 truncate">{k?.label ?? other.kind}</span>
                              {room && (
                                <span className="shrink-0 text-xs text-(--secondary-text-color)">
                                  {room.name ?? room.id}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label={`Unbind ${k?.label ?? other.kind}`}
                              onClick={() => setUnbinding(other)}
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-(--error-color)/70 hover:bg-(--secondary-background-color) hover:text-(--error-color)"
                            >
                              <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-xs text-(--secondary-text-color)">
                    Clicking this item in 3D acts on the device. Right click it, or hold it on a touch screen, for the
                    device's own dialog in Home Assistant, where brightness, color and the rest live.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="mt-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-(--divider-color) text-sm font-semibold text-(--error-color)"
        >
          <FontAwesomeIcon icon={faTrash} className="size-3.5" />
          Delete {kind.label}
        </button>

        <AlertDialog open={unbinding !== null} onOpenChange={open => !open && setUnbinding(null)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Let go of this piece?</AlertDialogTitle>
            <AlertDialogDescription>
              {decorationKind(unbinding?.kind ?? '')?.label ?? 'The item'} stops standing in for this device. The piece
              itself stays on the plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnbinding(null)}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (unbinding) onBind(unbinding.id, null)
                setUnbinding(null)
              }}
            >
              Unbind
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
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
        <p className="text-sm text-(--secondary-text-color)">Draw a room first, with the draw tool.</p>
      )}

      <Sticky>
        <div
          ref={previewBox}
          className="w-full overflow-hidden rounded-xl bg-(--secondary-background-color)"
          style={{ height }}
        >
          {previewItem ? (
            <ModelPreview item={previewItem} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-(--secondary-text-color)">
              Hover an item to preview it
            </div>
          )}
        </div>
        <PreviewHandle onDrag={resize} />
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
              // The whole row adds the piece, not the plus alone: the plus
              // is what the row does, not the only place it can be asked.
              <button
                key={k.id}
                type="button"
                disabled={rooms.length === 0}
                aria-label={`Add ${k.label}`}
                onMouseEnter={() => setHovered(k)}
                onMouseLeave={() => setHovered(h => (h?.id === k.id ? null : h))}
                onClick={() => onAdd(k)}
                className={cn(
                  'grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1 text-left disabled:cursor-default',
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
                  <span className="flex size-8 items-center justify-center" style={{ color: accent }}>
                    <FontAwesomeIcon icon={faPlus} className="size-4" />
                  </span>
                ) : (
                  <span />
                )}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
