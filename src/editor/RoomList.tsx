import type { Selection } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { ROOM_COLORS } from '#/theme.ts'
import type { Area, RoomConfig } from '#/types.ts'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  rooms: RoomConfig[]
  areas: Area[]
  selection: Selection
  onSelect: (roomId: string) => void
  onDelete: (id: string) => void
}

// Picking a room from the list. Its name, area and floor are edited above,
// in the block every mode shows for the selected room.
export default function RoomList({ rooms, areas, selection, onSelect, onDelete }: Props) {
  const areaName = (id: string | undefined) => areas.find(a => a.area_id === id)?.name ?? ''

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-(--secondary-text-color)">No rooms yet. Pick the Draw tool and click on the canvas.</p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {rooms.map((room, i) => (
        <div
          key={room.id}
          onClick={() => onSelect(room.id)}
          className={cn(
            'grid cursor-pointer grid-cols-[12px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1.5',
            selection.roomId === room.id && 'border-(--primary-color)',
          )}
        >
          <span
            className="size-3 rounded-full"
            style={{ background: room.color ?? ROOM_COLORS[i % ROOM_COLORS.length] }}
          />
          <p className="truncate text-sm text-(--primary-text-color)">{room.name ?? room.id}</p>
          <p className="truncate text-xs text-(--secondary-text-color)">{areaName(room.area_id)}</p>
          <button
            type="button"
            aria-label="Delete room"
            className="flex size-7 items-center justify-center rounded text-(--secondary-text-color) hover:text-(--error-color)"
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Delete ${room.name ?? room.id}?`)) onDelete(room.id)
            }}
          >
            <FontAwesomeIcon icon={faTrash} className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
