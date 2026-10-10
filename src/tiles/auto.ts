import type { CardConfig, DecorationConfig, DeviceConfig, RoomConfig } from '#/types.ts'

// The tiles of the floorplan's side panel, made from the devices placed on
// the floorplan and the entities given to each room: a heading per room,
// then a tile for each of its entities, in the room's order. The home's own
// entities come first, under the home's heading, in a group with no room.

export type AutoCard = { type: string; [key: string]: unknown }
export type AutoGroup = { room: string | null; cards: AutoCard[] }

const TILE_TYPES: Record<string, string> = {
  light: 'fp-toggle',
  switch: 'fp-toggle',
  input_boolean: 'fp-toggle',
  fan: 'fp-toggle',
  humidifier: 'fp-toggle',
  siren: 'fp-toggle',
  remote: 'fp-toggle',
  automation: 'fp-toggle',
  valve: 'fp-toggle',
  climate: 'fp-climate',
  water_heater: 'fp-climate',
  media_player: 'fp-media',
  lock: 'fp-lock',
  cover: 'fp-cover',
  vacuum: 'fp-vacuum',
  camera: 'fp-camera',
  button: 'fp-button',
  input_button: 'fp-button',
  script: 'fp-button',
  scene: 'fp-button',
  select: 'fp-select',
  input_select: 'fp-select',
  weather: 'fp-weather',
}

// Anything else, a sensor, a person or the weather, shows its state.
const FALLBACK = 'fp-entity'

// Tiles with buttons of their own are wide, so the buttons show.
const WIDE = new Set(['fp-cover', 'fp-vacuum', 'fp-climate', 'fp-media'])

// The icon for the piece a device stands behind, where it says more than
// the device's domain would.
const KIND_ICONS: Record<string, string> = {
  light_ceiling: 'ph:lightbulb',
  light_pendant: 'ph:lamp-pendant',
  light_floor: 'ph:lamp',
  light_table: 'ph:lamp',
  light_wall: 'ph:lightbulb',
  light_strip: 'ph:lightbulb-filament',
  light_strip_ceiling: 'ph:lightbulb-filament',
  light_strip_wall: 'ph:lightbulb-filament',
  blind: 'ph:rows',
  curtain: 'ph:rows',
  door: 'ph:door',
  sliding_door: 'ph:door',
  garage_door: 'ph:garage',
  awning: 'ph:sun',
  louvred_pergola: 'ph:sun',
  projector_screen: 'ph:projector-screen',
  projector: 'ph:film-strip',
  projector_portable: 'ph:film-strip',
  projector_ust: 'ph:film-strip',
  tv: 'ph:television',
  tv_wall: 'ph:television',
  monitor: 'ph:monitor',
  pc_tower: 'ph:desktop',
  fan_ceiling: 'ph:fan',
  fan_floor: 'ph:fan',
  air_purifier: 'ph:wind',
  ac_unit: 'ph:snowflake',
  radiator: 'ph:fire',
  fireplace: 'ph:fire',
  towel_rail: 'ph:fire',
  christmas_tree: 'ph:tree',
  plant_large: 'ph:plant',
  plant_small: 'ph:plant',
  plant_wall: 'ph:plant',
  oven: 'ph:oven',
  coffee_machine: 'ph:cooking-pot',
  kettle: 'ph:cooking-pot',
  cooking_robot: 'ph:cooking-pot',
  air_fryer: 'ph:cooking-pot',
  bathtub: 'ph:bathtub',
  shower: 'ph:shower',
  toilet: 'ph:toilet',
  hot_tub: 'ph:bathtub',
  bed_double: 'ph:bed',
  sofa: 'ph:couch',
  desk: 'ph:desktop',
  pet_feeder: 'ph:paw-print',
  litter_box: 'ph:paw-print',
  vacuum_robot: 'ph:robot-vacuum',
  camera: 'ph:security-camera',
  doorbell: 'ph:bell',
  leak_sensor: 'ph:drop',
}

function entityTile(entityId: string): AutoCard {
  const type = TILE_TYPES[entityId.split('.')[0]] ?? FALLBACK
  const card: AutoCard = { type: `custom:${type}`, entity: entityId, room_filter: 'show' }
  if (WIDE.has(type)) card.size = 'wide'
  return card
}

function tile(device: DeviceConfig, pieces: Map<string, DecorationConfig>): AutoCard {
  const card = entityTile(device.entity_id)
  const kind = device.decorations?.map(id => pieces.get(id)?.kind).find(Boolean)
  const icon = kind && KIND_ICONS[kind]
  if (icon) card.piece_icon = icon
  // A projector screen comes down to open.
  if (kind === 'projector_screen') card.invert = true
  return card
}

// The entities of a room's tiles, in the order they show: the devices on
// the plan in the plan's order, then the room's own entities, and then
// moved where the room's order puts them. An entity the order does not
// name keeps its place after the ones it does.
export function roomEntities(plan: CardConfig, room: RoomConfig) {
  const placed = (plan.devices ?? []).filter(device => device.room === room.id).map(device => device.entity_id)
  const ids = [...new Set([...placed, ...(room.entities ?? [])])]
  const rank = new Map((room.order ?? []).map((id, index) => [id, index]))
  return ids
    .map((id, index) => ({ id, index }))
    .sort((a, b) => (rank.get(a.id) ?? rank.size + a.index) - (rank.get(b.id) ?? rank.size + b.index))
    .map(entry => entry.id)
}

function heading(room: RoomConfig): AutoCard {
  const card: AutoCard = { type: 'custom:fp-title', room_filter: 'show' }
  if (room.name) card.title = room.name
  else if (room.area_id) card.area = room.area_id
  else card.title = room.id
  return card
}

export function autoGroups(plan: CardConfig): AutoGroup[] {
  const pieces = new Map((plan.decorations ?? []).map(piece => [piece.id, piece]))
  const groups: AutoGroup[] = []
  const home = [...new Set(plan.home?.entities ?? [])]
  if (home.length) {
    const title: AutoCard = { type: 'custom:fp-title', title: plan.home?.name || 'Home', room_filter: 'show' }
    groups.push({ room: null, cards: [title, ...home.map(entityTile)] })
  }
  for (const room of plan.rooms ?? []) {
    const devices = new Map(
      (plan.devices ?? []).filter(device => device.room === room.id).map(device => [device.entity_id, device]),
    )
    const tiles = roomEntities(plan, room).map(id => {
      const device = devices.get(id)
      return device ? tile(device, pieces) : entityTile(id)
    })
    if (tiles.length) groups.push({ room: room.id, cards: [heading(room), ...tiles] })
  }
  return groups
}
