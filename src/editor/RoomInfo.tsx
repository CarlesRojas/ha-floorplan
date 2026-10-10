import { decorationKind } from '#/decoration/catalog.ts'
import { SelectedHeader, Switch } from '#/editor/panel.tsx'
import { neighboursOf } from '#/geometry/passages.ts'
import { EDITOR_ACCENT_COLOR, EDITOR_TINT_COLOR, FLOOR_MATERIALS, ROOM_COLORS } from '#/theme.ts'
import type { Area, DecorationConfig, RoomConfig } from '#/types.ts'
import { useFlash } from '#/lib/flash.ts'
import { cn } from '#/lib/utils.ts'
import { colorWell, deleteButton, field, group, groupTitle, note, plainButton, row } from '#/editor/look.ts'
import { faCamera, faCheck, faDoorOpen, faEye, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  room: RoomConfig
  rooms: RoomConfig[]
  areas: Area[]
  onRename: (id: string, name: string | undefined) => void
  onRenameDone: () => void
  onAssignArea: (roomId: string, areaId: string | undefined) => void
  onFloor: (roomId: string, floor: RoomConfig['floor']) => void
  // Every piece of the home, to tell which rooms beside this one a door
  // leads into.
  decorations: DecorationConfig[]
  // Shows or hides the sign on the floor into a room open beside this one.
  onArrow: (roomId: string, other: string, shown: boolean) => void
  // The room's view: saved from where the 3D view's camera stands now,
  // shown by flying the camera to it, or forgotten.
  onSaveCamera: (roomId: string) => void
  onShowCamera: (roomId: string) => void
  onClearCamera: (roomId: string) => void
  // Whether there is a 3D view to take the camera from.
  hasPreview: boolean
  onDelete: (roomId: string) => void
  onDeselect: () => void
}

const input = field
const cameraButton = plainButton

// The selected room: its name, the area it stands for, the floor under it,
// and the way to be rid of it.
export default function RoomInfo({
  room,
  rooms,
  areas,
  onRename,
  onRenameDone,
  onAssignArea,
  onFloor,
  decorations,
  onArrow,
  onSaveCamera,
  onShowCamera,
  onClearCamera,
  hasPreview,
  onDelete,
  onDeselect,
}: Props) {
  // The save button shows for a moment that the view was taken.
  const [saved, flashSaved] = useFlash()
  const accent = EDITOR_ACCENT_COLOR
  const index = rooms.findIndex(r => r.id === room.id)
  const sorted = [...areas].sort((a, b) => a.name.localeCompare(b.name))
  const used = new Map(rooms.filter(r => r.area_id).map(r => [r.area_id!, r.id]))
  const swatch = (
    <span
      className="ring-fill-strong size-3 shrink-0 rounded-full ring-2"
      style={{ background: room.color ?? ROOM_COLORS[(index < 0 ? 0 : index) % ROOM_COLORS.length] }}
    />
  )
  const neighbours = neighboursOf(room, rooms, decorations)
  const slider = (label: string, key: 'scale' | 'intensity' | 'rotation', min: number, max: number, step: number) => {
    const value = room.floor?.[key] ?? (key === 'rotation' ? 0 : 1)
    return (
      <label className={cn(row, 'grid-cols-[96px_1fr_56px]')}>
        {label}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ accentColor: EDITOR_TINT_COLOR }}
          onChange={e => onFloor(room.id, { ...room.floor!, [key]: Number(e.target.value) })}
        />
        <span className="text-label-2 text-right text-xs tabular-nums">
          {key === 'rotation' ? `${value}°` : `${value.toFixed(2)}x`}
        </span>
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <SelectedHeader title={room.name ?? room.id} tag={swatch} onBack={onDeselect} />
      <div className={group}>
        <label className={cn(row, 'grid-cols-[96px_1fr]')}>
          Name
          <input
            className={input}
            value={room.name ?? ''}
            placeholder={room.id}
            onChange={e => onRename(room.id, e.target.value || undefined)}
            onBlur={onRenameDone}
          />
        </label>
        <label className={cn(row, 'grid-cols-[96px_1fr]')}>
          Area
          <select
            className={input}
            value={room.area_id ?? ''}
            onChange={e => onAssignArea(room.id, e.target.value || undefined)}
          >
            <option value="">No area</option>
            {sorted.map(a => {
              const owner = used.get(a.area_id)
              const taken = owner !== undefined && owner !== room.id
              return (
                <option key={a.area_id} value={a.area_id} disabled={taken}>
                  {a.name}
                  {taken ? ' (used)' : ''}
                </option>
              )
            })}
          </select>
        </label>
      </div>
      <div className={group}>
        <label className={cn(row, 'grid-cols-[96px_1fr]')}>
          Floor
          <select
            className={input}
            value={room.floor?.material ?? ''}
            onChange={e => onFloor(room.id, e.target.value ? { ...room.floor, material: e.target.value } : undefined)}
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
            <label className={cn(row, 'grid-cols-[96px_1fr]')}>
              Tint
              <input
                type="color"
                className={colorWell}
                value={room.floor.color ?? FLOOR_MATERIALS[room.floor.material]?.color ?? '#ffffff'}
                onChange={e => onFloor(room.id, { ...room.floor!, color: e.target.value })}
              />
            </label>
            {slider('Pattern size', 'scale', 0.25, 4, 0.05)}
            {slider('Pattern depth', 'intensity', 0, 2, 0.05)}
            {slider('Pattern angle', 'rotation', 0, 175, 5)}
          </>
        )}
      </div>
      <div className={group}>
        <div className={cn(row, 'grid-cols-[96px_1fr]')}>
          Camera
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              disabled={!hasPreview}
              title={hasPreview ? "Save where the 3D view stands now as this room's view" : 'Open the 3D view first'}
              onClick={() => {
                onSaveCamera(room.id)
                flashSaved()
              }}
              className={cn(cameraButton, 'min-w-0 flex-1 px-2', saved && 'text-success')}
            >
              <FontAwesomeIcon icon={saved ? faCheck : faCamera} className="size-3.5" />
              <span className="truncate">
                {saved ? 'View saved' : room.camera ? 'Replace view' : 'Use current view'}
              </span>
            </button>
            <button
              type="button"
              disabled={!hasPreview}
              aria-label="Fly to this room's view"
              title="Fly to this room's view"
              onClick={() => onShowCamera(room.id)}
              className={cn(cameraButton, 'size-8 shrink-0 px-0')}
            >
              <FontAwesomeIcon icon={faEye} className="size-3.5" />
            </button>
            {room.camera && (
              <button
                type="button"
                aria-label="Go back to the view the room comes with"
                title="Go back to the view the room comes with"
                onClick={() => onClearCamera(room.id)}
                className={cn(cameraButton, 'size-8 shrink-0 px-0')}
              >
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className={note}>
          {room.camera
            ? 'Clicking this room in the card flies the camera to this view and fades the rest of the home away.'
            : 'Clicking this room in the card flies the camera to it and fades the rest of the home away. Orbit the 3D view to where the room looks best and save it to choose the view yourself.'}
        </p>
      </div>
      {neighbours.length > 0 && (
        <div className={group}>
          <p className={groupTitle}>Rooms beside it</p>
          {neighbours.map(neighbour => {
            const other = rooms.find(r => r.id === neighbour.id)
            const name = other?.name ?? neighbour.id
            return (
              <div key={neighbour.id} className={cn(row, 'min-h-6 grid-cols-[1fr_auto]')}>
                <span className="truncate">{name}</span>
                {neighbour.door ? (
                  <span className="text-label-2 flex items-center gap-1.5 text-xs">
                    <FontAwesomeIcon icon={faDoorOpen} className="size-3" />
                    {decorationKind(neighbour.door)?.label ?? 'Door'}
                  </span>
                ) : (
                  <Switch
                    checked={!room.hide_arrows?.includes(neighbour.id)}
                    accent={accent}
                    label={`Show an arrow into ${name}`}
                    onChange={shown => onArrow(room.id, neighbour.id, shown)}
                  />
                )}
              </div>
            )
          })}
          <p className={note}>
            In this room's view a click on a door flies to the room behind it. A room open beside it, with no door
            between them, gets an arrow on the floor that does the same, unless it is switched off here.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Delete ${room.name ?? room.id}?`)) onDelete(room.id)
        }}
        className={deleteButton}
      >
        <FontAwesomeIcon icon={faTrash} className="size-3.5" />
        Delete room
      </button>
    </div>
  )
}
