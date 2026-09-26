// The demo flat: a small, fully furnished home with a living room and
// kitchen in one room, a bedroom and a bathroom. scripts/demoflat.ts writes
// it to demoflat.yaml and the dev page at src/dev/demoflat.html draws it
// with made up devices, for the screenshots in the README.
import { snapToWall } from '#/editor/walls.ts'
import type {
  Area,
  CardConfig,
  DecorationConfig,
  DeviceConfig,
  EntityRegistryEntry,
  EntityState,
  Point,
} from '#/types.ts'

// The three rooms, counter clockwise on the plan. The living room and the
// kitchen share one room, the bedroom and the bathroom sit to its right.
const LIVING: Point[] = [
  [0, 0],
  [4.2, 0],
  [4.2, 5.6],
  [0, 5.6],
]
const BEDROOM: Point[] = [
  [4.2, 2.2],
  [7.8, 2.2],
  [7.8, 5.6],
  [4.2, 5.6],
]
const BATHROOM: Point[] = [
  [4.2, 0],
  [7.8, 0],
  [7.8, 2.2],
  [4.2, 2.2],
]
const POINTS: Record<string, Point[]> = { living: LIVING, bedroom: BEDROOM, bathroom: BATHROOM }

type Extra = Partial<Omit<DecorationConfig, 'id' | 'kind' | 'room' | 'position'>>

const decorations: DecorationConfig[] = []
const devices: DeviceConfig[] = []

// A piece on the floor or the ceiling, at a point on the plan.
function item(id: string, kind: string, room: string, position: Point, extra: Extra = {}) {
  decorations.push({ id, kind, room, position, ...extra })
  return id
}

// A piece on a wall: snapped to the room's nearest wall, facing into the room.
function wall(id: string, kind: string, room: string, near: Point, extra: Extra = {}) {
  const snapped = snapToWall(near, POINTS[room])
  decorations.push({ id, kind, room, position: snapped.point, rotation: snapped.rotation, ...extra })
  return id
}

// A Home Assistant entity standing behind one or more pieces.
function device(entity_id: string, ...ids: string[]) {
  const first = decorations.find(d => d.id === ids[0])!
  devices.push({ entity_id, room: first.room, position: first.position, decorations: ids })
}

// Living room, along the bottom half of the room. The sofa faces the TV on
// the bottom wall over a rug, with the bookshelf and a window on the left
// wall and the front door beside it.
item('sofa', 'sofa', 'living', [2.3, 2.5], { variant: 'dresde' })
item('rug', 'rug', 'living', [2.3, 1.4], { variant: 'kilim' })
item('coffee_table', 'coffee_table', 'living', [2.3, 1.3], { variant: 'slatted' })
item('books', 'books', 'living', [2.05, 1.3], { on: 'coffee_table' })
item('coffee_plant', 'plant_small', 'living', [2.6, 1.3], { variant: 'pilea', on: 'coffee_table' })
item('sideboard', 'sideboard', 'living', [2.3, 0.21], { variant: 'oak', rotation: 180 })
wall('tv', 'tv_wall', 'living', [2.3, 0])
item('soundbar', 'soundbar', 'living', [2.3, 0.21], { variant: 'bar', on: 'sideboard', rotation: 180 })
item('speaker', 'speaker', 'living', [3.0, 0.21], { variant: 'pod', on: 'sideboard' })
item('living_plant', 'plant_large', 'living', [3.75, 0.45], { variant: 'fiddle' })
wall('bookshelf', 'bookshelf', 'living', [0, 1.5], { variant: 'billy' })
item('floor_lamp', 'light_floor', 'living', [0.4, 3.1], { variant: 'tmm' })
wall('living_window', 'window', 'living', [0, 3.9], { variant: 'casement' })
wall('living_blind', 'blind', 'living', [0, 3.9], { variant: 'venetian' })
wall('front_door', 'door', 'living', [0.7, 0], { variant: 'panel' })
wall('front_lock', 'smart_lock', 'living', [1.05, 0])
wall('clock', 'wall_clock', 'living', [1.4, 0], { variant: 'oak' })
wall('thermostat', 'thermostat', 'living', [3.5, 0])
item('living_light', 'light_ceiling', 'living', [2.3, 1.8])
item('vacuum', 'vacuum_robot', 'living', [0.45, 4.6])

// Kitchen, along the top wall of the same room, with an island and two
// stools between it and the sofa.
item('counter_a', 'kitchen_counter', 'living', [0.9, 5.3], { variant: 'run' })
item('counter_b', 'kitchen_counter', 'living', [2.7, 5.3], { variant: 'run' })
item('hob', 'hob', 'living', [0.9, 5.3], { variant: 'induction', on: 'counter_a' })
item('hood', 'extractor_hood', 'living', [0.9, 5.3])
item('kettle', 'kettle', 'living', [0.3, 5.3], { variant: 'gooseneck', on: 'counter_a' })
item('coffee_machine', 'coffee_machine', 'living', [1.55, 5.3], { variant: 'bambino', on: 'counter_a' })
item('sink', 'kitchen_sink', 'living', [2.5, 5.3], { variant: 'undermount', on: 'counter_b' })
item('toaster', 'toaster', 'living', [3.3, 5.3], { variant: 'retro', on: 'counter_b' })
wall('cabinets_a', 'upper_cabinets', 'living', [0.9, 5.6])
wall('cabinets_b', 'upper_cabinets', 'living', [2.7, 5.6])
item('fridge', 'fridge', 'living', [3.9, 5.27], { variant: 'bespoke' })
item('island', 'kitchen_counter', 'living', [2.1, 4.1], { variant: 'island' })
item('island_vase', 'vase', 'living', [2.7, 4.1], { on: 'island' })
item('stool_a', 'stool', 'living', [1.7, 3.4], { variant: 'lauta', rotation: 180 })
item('stool_b', 'stool', 'living', [2.5, 3.4], { variant: 'lauta', rotation: 180 })
item('pendant_a', 'light_pendant', 'living', [1.65, 4.1], { variant: 'globo_cestita' })
item('pendant_b', 'light_pendant', 'living', [2.55, 4.1], { variant: 'globo_cestita' })
item('smoke', 'smoke_detector', 'living', [3.2, 4.6])

// Bedroom: the bed against the top wall with a lamp on each nightstand, a
// wardrobe and a window on the right wall, a dresser and a mirror on the
// left wall, and the door from the living room.
item('bed', 'bed_double', 'bedroom', [6.0, 4.58], { variant: 'upholstered' })
item('nightstand_a', 'side_table', 'bedroom', [4.95, 5.35], { variant: 'nightstand' })
item('nightstand_b', 'side_table', 'bedroom', [7.05, 5.35], { variant: 'nightstand' })
item('bedside_a', 'light_table', 'bedroom', [4.95, 5.35], { variant: 'cestita', on: 'nightstand_a' })
item('bedside_b', 'light_table', 'bedroom', [7.05, 5.35], { variant: 'cestita', on: 'nightstand_b' })
item('bedroom_rug', 'rug', 'bedroom', [6.0, 3.1], { variant: 'round' })
item('bedroom_light', 'light_ceiling', 'bedroom', [6.0, 3.6])
wall('wardrobe', 'wardrobe', 'bedroom', [7.8, 3.0], { variant: 'sliding' })
wall('bedroom_window', 'window', 'bedroom', [7.8, 4.5], { variant: 'sash' })
wall('bedroom_blind', 'blind', 'bedroom', [7.8, 4.5], { variant: 'shutter' })
wall('radiator', 'radiator', 'bedroom', [7.8, 4.5], { variant: 'panel' })
wall('dresser', 'dresser', 'bedroom', [4.2, 3.0], { variant: 'oak' })
item('dresser_plant', 'plant_small', 'bedroom', [4.45, 3.3], { variant: 'pothos', on: 'dresser' })
wall('bedroom_mirror', 'wall_mirror', 'bedroom', [4.2, 3.0], { variant: 'round' })
wall('bedroom_door', 'door', 'bedroom', [4.2, 4.4], { variant: 'flush' })
wall('motion', 'motion_sensor', 'bedroom', [6.0, 2.2])

// Bathroom: shower in the far corner, toilet and washing machine on the
// bottom wall, the basin under a mirror on the top wall, and the door from
// the living room.
item('shower', 'shower', 'bathroom', [7.35, 1.75])
item('toilet', 'toilet', 'bathroom', [6.3, 0.28], { variant: 'wall_hung', rotation: 180 })
item('washer', 'washing_machine', 'bathroom', [4.55, 0.3], { rotation: 180 })
item('basin', 'basin', 'bathroom', [5.4, 1.96], { variant: 'vanity' })
item('basin_plant', 'plant_small', 'bathroom', [5.7, 1.96], { variant: 'snake', on: 'basin' })
wall('bathroom_mirror', 'wall_mirror', 'bathroom', [5.4, 2.2], { variant: 'round' })
wall('towel_rail', 'towel_rail', 'bathroom', [7.8, 0.7], { variant: 'ladder' })
item('bathroom_light', 'light_ceiling', 'bathroom', [6.0, 1.1])
wall('bathroom_door', 'door', 'bathroom', [4.2, 1.3], { variant: 'flush' })

// The devices behind the pieces. The entity ids are made up: in your own
// card the editor binds the pieces to your real entities.
device('light.living_room', 'living_light')
device('light.floor_lamp', 'floor_lamp')
device('light.kitchen_island', 'pendant_a', 'pendant_b')
device('light.bedroom', 'bedroom_light')
device('light.bedside_left', 'bedside_a')
device('light.bedside_right', 'bedside_b')
device('light.bathroom', 'bathroom_light')
device('cover.living_blind', 'living_blind')
device('cover.bedroom_blind', 'bedroom_blind')
device('media_player.living_tv', 'tv', 'soundbar')
device('media_player.kitchen_speaker', 'speaker')
device('climate.living_room', 'thermostat')
device('switch.bedroom_radiator', 'radiator')
device('switch.towel_rail', 'towel_rail')
device('switch.washing_machine', 'washer')
device('switch.coffee_machine', 'coffee_machine')
device('switch.kettle', 'kettle')
device('fan.extractor_hood', 'hood')
device('lock.front_door', 'front_lock')
device('binary_sensor.front_door', 'front_door')
device('vacuum.robot', 'vacuum')
device('binary_sensor.bedroom_motion', 'motion')
device('binary_sensor.smoke', 'smoke')

export const DEMO_FLAT: CardConfig = {
  type: 'custom:floorplan-3d',
  rooms: [
    {
      id: 'living',
      name: 'Living room',
      area_id: 'living_room',
      points: LIVING,
      floor: { material: 'wood' },
      // A click on the floor flies to a close-up of the room.
      camera: { position: [2.1, 3.8, 1.6], target: [2.1, 0.4, -4.4] },
    },
    {
      id: 'bedroom',
      name: 'Bedroom',
      area_id: 'bedroom',
      points: BEDROOM,
      floor: { material: 'carpet' },
      camera: { position: [6.0, 4.6, -0.4], target: [6.0, 0.3, -4.3] },
    },
    {
      id: 'bathroom',
      name: 'Bathroom',
      area_id: 'bathroom',
      points: BATHROOM,
      floor: { material: 'tiles' },
      camera: { position: [5.0, 3.0, 2.8], target: [6.2, 0.3, -1.2] },
    },
  ],
  devices,
  decorations,
  // The view the card opens with: the whole flat from the front left corner.
  camera: { position: [-2.5, 7.5, 6.5], target: [3.9, 0, -2.6] },
}

// What the made up devices report, for the dev page. Every entity starts
// off, closed, docked or locked; the page flips the ones asked for.
const NAMES: Record<string, string> = {
  'light.living_room': 'Living room light',
  'light.floor_lamp': 'Floor lamp',
  'light.kitchen_island': 'Kitchen island pendants',
  'light.bedroom': 'Bedroom light',
  'light.bedside_left': 'Left bedside lamp',
  'light.bedside_right': 'Right bedside lamp',
  'light.bathroom': 'Bathroom light',
  'cover.living_blind': 'Living room blind',
  'cover.bedroom_blind': 'Bedroom shutter',
  'media_player.living_tv': 'Living room TV',
  'media_player.kitchen_speaker': 'Kitchen speaker',
  'climate.living_room': 'Thermostat',
  'switch.bedroom_radiator': 'Bedroom radiator',
  'switch.towel_rail': 'Towel rail',
  'switch.washing_machine': 'Washing machine',
  'switch.coffee_machine': 'Coffee machine',
  'switch.kettle': 'Kettle',
  'fan.extractor_hood': 'Extractor hood',
  'lock.front_door': 'Front door lock',
  'binary_sensor.front_door': 'Front door',
  'vacuum.robot': 'Robot vacuum',
  'binary_sensor.bedroom_motion': 'Bedroom motion',
  'binary_sensor.smoke': 'Smoke detector',
}

function initial(entityId: string): { state: string; attributes: Record<string, unknown> } {
  const domain = entityId.split('.')[0]
  switch (domain) {
    case 'light':
      return { state: 'off', attributes: { supported_color_modes: ['color_temp'] } }
    case 'cover':
      return { state: 'closed', attributes: { current_position: 0, device_class: 'blind' } }
    case 'media_player':
      return { state: 'off', attributes: {} }
    case 'climate':
      return {
        state: 'heat',
        attributes: { current_temperature: 21.5, temperature: 22, hvac_action: 'heating', hvac_modes: ['heat', 'off'] },
      }
    case 'lock':
      return { state: 'locked', attributes: {} }
    case 'vacuum':
      return { state: 'docked', attributes: {} }
    case 'fan':
      return { state: 'off', attributes: { percentage: 0 } }
    case 'binary_sensor':
      return { state: 'off', attributes: { device_class: entityId.split('.')[1].split('_').pop() } }
    default:
      return { state: 'off', attributes: {} }
  }
}

// The entity the other way: on, open, playing, unlocked, cleaning.
export function flip(entity: EntityState) {
  const domain = entity.entity_id.split('.')[0]
  const a = entity.attributes
  switch (domain) {
    case 'light':
      if (entity.state === 'on') {
        entity.state = 'off'
        delete a.brightness
        delete a.color_temp_kelvin
      } else {
        entity.state = 'on'
        a.brightness = 255
        a.color_temp_kelvin = 2700
      }
      break
    case 'cover':
      entity.state = entity.state === 'open' ? 'closed' : 'open'
      a.current_position = entity.state === 'open' ? 100 : 0
      break
    case 'media_player':
      entity.state = entity.state === 'off' ? 'playing' : 'off'
      break
    case 'climate':
      entity.state = entity.state === 'off' ? 'heat' : 'off'
      break
    case 'lock':
      entity.state = entity.state === 'locked' ? 'unlocked' : 'locked'
      break
    case 'vacuum':
      entity.state = entity.state === 'cleaning' ? 'docked' : 'cleaning'
      break
    case 'fan':
      entity.state = entity.state === 'on' ? 'off' : 'on'
      a.percentage = entity.state === 'on' ? 60 : 0
      break
    default:
      entity.state = entity.state === 'on' ? 'off' : 'on'
  }
}

const now = new Date().toISOString()
export const DEMO_STATES: Record<string, EntityState> = Object.fromEntries(
  Object.entries(NAMES).map(([entity_id, name]) => {
    const { state, attributes } = initial(entity_id)
    return [
      entity_id,
      { entity_id, state, attributes: { ...attributes, friendly_name: name }, last_changed: now, last_updated: now },
    ]
  }),
)

export const DEMO_ENTITIES: Record<string, EntityRegistryEntry> = Object.fromEntries(
  devices.map(d => [
    d.entity_id,
    { entity_id: d.entity_id, area_id: DEMO_FLAT.rooms!.find(r => r.id === d.room)!.area_id },
  ]),
)

export const DEMO_AREAS: Record<string, Area> = Object.fromEntries(
  DEMO_FLAT.rooms!.map(r => [r.area_id!, { area_id: r.area_id!, name: r.name!, floor_id: null, icon: null }]),
)
