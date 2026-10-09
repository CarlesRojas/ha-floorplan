import { useEffect } from 'react'

// The room the floorplan card is showing, told to the Floorplan tiles
// so they can show only what is in it. Null shows everything. The filter
// lives in the window, so it is per browser tab and starts empty on every
// load, like the 3D view it follows.
export type RoomFilter = { area_id: string | null; room_id: string | null } | null

export const ROOM_FILTER_EVENT = 'fp-room-filter'

declare global {
  interface Window {
    __fpRoomFilter?: RoomFilter
  }
  interface WindowEventMap {
    'fp-room-filter': CustomEvent<RoomFilter>
  }
}

export function roomFilter(): RoomFilter {
  return window.__fpRoomFilter ?? null
}

export function setRoomFilter(filter: RoomFilter) {
  const now = roomFilter()
  if (now?.area_id === filter?.area_id && now?.room_id === filter?.room_id) return
  window.__fpRoomFilter = filter
  window.dispatchEvent(new CustomEvent(ROOM_FILTER_EVENT, { detail: filter }))
}

export function onRoomFilter(listener: (filter: RoomFilter) => void) {
  const handle = (event: CustomEvent<RoomFilter>) => listener(event.detail ?? null)
  window.addEventListener(ROOM_FILTER_EVENT, handle)
  return () => window.removeEventListener(ROOM_FILTER_EVENT, handle)
}

const warned = new Set<string>()

// Tells the tiles which room is in view, and clears the filter when the
// card goes away. A room with no area set filters nothing, since no tile
// could be matched to it.
export function useRoomFilter(room: { id: string; area_id?: string } | undefined) {
  const id = room?.id ?? null
  const area = room?.area_id ?? null
  useEffect(() => {
    if (id && !area && !warned.has(id)) {
      warned.add(id)
      console.warn(`Floorplan 3D: room ${id} has no area_id, so the tiles show everything while it is in view`)
    }
    setRoomFilter(id && area ? { area_id: area, room_id: id } : null)
  }, [id, area])
  useEffect(() => () => setRoomFilter(null), [])
}
