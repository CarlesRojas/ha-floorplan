// The demo flat: a small, fully furnished home with a living room, a
// kitchen open to it, a bedroom and a bathroom. scripts/demoflat.ts writes
// it to demoflat.yaml and the dev page at src/dev/demoflat.html draws it
// with made up devices, for the screenshots in the README.
import { decorationKind, paramValue } from '#/decoration/catalog.ts'
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

// The four rooms, counter clockwise on the plan. The kitchen is open to the
// living room, on the same floor behind the sofa, and the bedroom and the
// bathroom sit to their right.
const LIVING: Point[] = [
  [0, 0],
  [4.2, 0],
  [4.2, 3.05],
  [0, 3.05],
]
const KITCHEN: Point[] = [
  [0, 3.05],
  [4.2, 3.05],
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
const POINTS: Record<string, Point[]> = { living: LIVING, kitchen: KITCHEN, bedroom: BEDROOM, bathroom: BATHROOM }

type Extra = Partial<Omit<DecorationConfig, 'id' | 'kind' | 'room' | 'position'>>

const decorations: DecorationConfig[] = []
const devices: DeviceConfig[] = []

// A piece on the floor or the ceiling, at a point on the plan.
function item(id: string, kind: string, room: string, position: Point, extra: Extra = {}) {
  decorations.push({ id, kind, room, position, ...extra })
  return id
}

// A piece on a wall: snapped to the room's nearest wall, facing into the room.
// One that stands on the floor is placed by its middle, so it moves into the
// room by half its depth to stand with its back to the wall.
function wall(id: string, kind: string, room: string, near: Point, extra: Extra = {}) {
  const snapped = snapToWall(near, POINTS[room])
  const spec = decorationKind(kind)!
  let position = snapped.point
  if (spec.mount === 'floor') {
    const half = paramValue(spec, extra.params, 'depth', extra.variant) / 2
    const angle = (snapped.rotation * Math.PI) / 180
    const round = (n: number) => Math.round(n * 1000) / 1000
    position = [round(position[0] + Math.sin(angle) * half), round(position[1] - Math.cos(angle) * half)]
  }
  decorations.push({ id, kind, room, position, rotation: snapped.rotation, ...extra })
  return id
}

// A Home Assistant entity standing behind one or more pieces.
function device(entity_id: string, ...ids: string[]) {
  const first = decorations.find(d => d.id === ids[0])!
  devices.push({ entity_id, room: first.room, position: first.position, decorations: ids })
}

// Living room. The sofa faces the TV on the bottom wall over a rug, with
// the front door in the bottom right corner.
item('sofa', 'sofa', 'living', [2.3, 2.5], { variant: 'block' })
item('rug', 'rug', 'living', [2.3, 1.4], { variant: 'kilim' })
item('coffee_table', 'coffee_table', 'living', [2.3, 1.3], { variant: 'slatted' })
item('books', 'books', 'living', [2.0, 1.25], { on: 'coffee_table', rotation: 300 })
item('coffee_plant', 'plant_small', 'living', [2.6, 1.4], { variant: 'pilea', on: 'coffee_table' })
item('sideboard', 'sideboard', 'living', [2.3, 0.21], { variant: 'oak', rotation: 180 })
wall('tv', 'tv_wall', 'living', [2.3, 0])
item('soundbar', 'soundbar', 'living', [2.3, 0.21], { variant: 'bar', on: 'sideboard', rotation: 180 })
item('living_plant', 'plant_large', 'living', [0.4, 0.4], { variant: 'fiddle' })
item('floor_lamp', 'light_floor', 'living', [0.4, 2.6], { variant: 'tmm' })
wall('front_door', 'door', 'living', [3.7, 0], { variant: 'panel' })
wall('front_lock', 'smart_lock', 'living', [3.15, 0])
wall('thermostat', 'thermostat', 'living', [0, 1.2])
item('living_light', 'light_ceiling', 'living', [2.3, 1.8])
item('vacuum', 'vacuum_robot', 'living', [4.0, 2.0], { rotation: 270 })

// Kitchen, along the top wall, with an island and two stools between it and
// the sofa, and a window on the left wall.
item('counter_a', 'kitchen_counter', 'kitchen', [0.9, 5.3], { variant: 'run' })
item('counter_b', 'kitchen_counter', 'kitchen', [2.7, 5.3], { variant: 'run' })
item('hob', 'hob', 'kitchen', [0.9, 5.3], { variant: 'induction', on: 'counter_a' })
item('kettle', 'kettle', 'kitchen', [0.3, 5.3], { variant: 'gooseneck', on: 'counter_a' })
item('coffee_machine', 'coffee_machine', 'kitchen', [1.9, 5.45], { variant: 'bambino', on: 'counter_b' })
item('sink', 'kitchen_sink', 'kitchen', [2.7, 5.3], { variant: 'undermount', on: 'counter_b' })
item('toaster', 'toaster', 'kitchen', [1.55, 5.45], { variant: 'retro', on: 'counter_a' })
wall('cabinets_a', 'upper_cabinets', 'kitchen', [0.9, 5.6])
wall('cabinets_b', 'upper_cabinets', 'kitchen', [2.7, 5.6])
item('fridge', 'fridge', 'kitchen', [3.9, 5.27], {
  variant: 'bespoke',
  params: { flip: 1 },
  colors: { body: '#9d9c9b', doors: '#acabaa' },
})
item('island', 'kitchen_counter', 'kitchen', [2.1, 4.1], { variant: 'island' })
item('island_vase', 'vase', 'kitchen', [2.65, 4.15], { on: 'island', params: { height: 0.21, size: 0.16 } })
item('stool_a', 'stool', 'kitchen', [1.7, 3.4], { variant: 'lauta', rotation: 180 })
item('stool_b', 'stool', 'kitchen', [2.5, 3.4], { variant: 'lauta', rotation: 180 })
item('pendant_a', 'light_pendant', 'kitchen', [1.65, 4.1], { variant: 'globo_cestita' })
item('pendant_b', 'light_pendant', 'kitchen', [2.55, 4.1], { variant: 'globo_cestita' })
item('smoke', 'smoke_detector', 'kitchen', [3.2, 4.6])
wall('kitchen_window', 'window', 'kitchen', [0, 3.9], { variant: 'casement', params: { height: 1.45, sill: 0.65 } })
wall('kitchen_blind', 'blind', 'kitchen', [0, 3.9], { variant: 'venetian' })

// Bedroom: a half wall across the top of the room with the bed against it,
// a lamp on each nightstand, a fan above and a portable projector on the
// half wall throwing its picture on a screen over the bottom wall. A slim
// wardrobe and a window on the right wall, a dresser on the left wall, and
// the door from the kitchen.
item('half_wall', 'half_wall', 'bedroom', [6.0, 5.5], { params: { width: 3.6, depth: 0.2, height: 1 } })
item('bed', 'bed_double', 'bedroom', [6.0, 4.25], { variant: 'upholstered' })
item('nightstand_a', 'side_table', 'bedroom', [4.95, 5.17], { variant: 'nightstand' })
item('nightstand_b', 'side_table', 'bedroom', [7.05, 5.17], { variant: 'nightstand' })
item('bedside_a', 'light_table', 'bedroom', [4.95, 5.17], { variant: 'cestita', on: 'nightstand_a' })
item('bedside_b', 'light_table', 'bedroom', [7.05, 5.17], { variant: 'cestita', on: 'nightstand_b' })
item('projector', 'projector_portable', 'bedroom', [6.0, 5.5], { on: 'half_wall', params: { throw: 3.2 } })
item('projector_screen', 'projector_screen', 'bedroom', [6.0, 2.26], { params: { inches: 115 } })
item('ceiling_fan', 'fan_ceiling', 'bedroom', [6.0, 4.4], { variant: 'classic' })
item('bedroom_rug', 'rug', 'bedroom', [6.0, 3.1], { variant: 'round' })
item('bedroom_light', 'light_ceiling', 'bedroom', [6.0, 3.4])
wall('wardrobe', 'wardrobe', 'bedroom', [7.8, 3.0], {
  variant: 'hinged',
  params: { depth: 0.45 },
  colors: { cabinet: '#dcc3a0' },
})
wall('bedroom_window', 'window', 'bedroom', [7.8, 4.5], { variant: 'casement', params: { height: 1.4, sill: 0.7 } })
wall('dresser', 'dresser', 'bedroom', [4.2, 3.0], { variant: 'oak' })
item('dresser_plant', 'plant_small', 'bedroom', [4.45, 3.3], { variant: 'pothos', on: 'dresser' })
wall('bedroom_door', 'door', 'bedroom', [4.2, 4.4], { variant: 'flush' })

// Bathroom: a walk-in shower in the far right corner, a wide vanity under a
// square mirror on the top wall, the toilet on the near wall, a towel rail
// by the shower with a litter box beside it, a leak sensor between the
// shower and the vanity, a motion sensor by the door, and the door from the
// living room.
item('shower', 'shower', 'bathroom', [7.1, 1.75], { params: { width: 1.4, depth: 0.9, flip: 0 } })
item('toilet', 'toilet', 'bathroom', [5.85, 0.3], { variant: 'wall_hung', rotation: 180, params: { depth: 0.6 } })
item('basin', 'basin', 'bathroom', [5.2, 1.95], { variant: 'vanity', params: { width: 1.2, depth: 0.52 } })
item('basin_plant', 'plant_small', 'bathroom', [5.65, 1.94], { variant: 'snake', on: 'basin' })
wall('bathroom_mirror', 'wall_mirror', 'bathroom', [5.2, 2.2], {
  variant: 'square',
  params: { size: 0.85, height: 1.5 },
})
wall('towel_rail', 'towel_rail', 'bathroom', [7.8, 0.5], { variant: 'grouped', colors: { rail: '#353636' } })
// Two spots on one circuit, over the vanity and the toilet.
item('bathroom_spot_a', 'light_ceiling', 'bathroom', [5.15, 1.0])
item('bathroom_spot_b', 'light_ceiling', 'bathroom', [6.15, 1.0])
item('leak', 'leak_sensor', 'bathroom', [6.1, 1.95])
item('litter_box', 'litter_box', 'bathroom', [6.6, 0.4], { rotation: 180 })
wall('motion', 'motion_sensor', 'bathroom', [4.2, 1.8])
// The door hangs on the living room side of the shared wall.
item('bathroom_door', 'door', 'living', [4.2, 1.1], { variant: 'flush', rotation: 270 })

// The devices behind the pieces. The entity ids are made up: in your own
// card the editor binds the pieces to your real entities.
device('light.living_room', 'living_light')
device('light.floor_lamp', 'floor_lamp')
device('light.kitchen_island', 'pendant_a', 'pendant_b')
device('light.bedroom', 'bedroom_light')
device('light.bedside_left', 'bedside_a')
device('light.bedside_right', 'bedside_b')
device('light.bathroom', 'bathroom_spot_a', 'bathroom_spot_b')
device('cover.kitchen_blind', 'kitchen_blind')
device('media_player.living_tv', 'tv', 'soundbar')
device('climate.living_room', 'thermostat')
device('switch.towel_rail', 'towel_rail')
device('switch.coffee_machine', 'coffee_machine')
device('switch.kettle', 'kettle')
device('fan.ceiling_fan', 'ceiling_fan')
// The screen comes down and the projector turns on with it.
device('cover.projector_screen', 'projector_screen', 'projector')
device('lock.front_door', 'front_lock')
device('binary_sensor.front_door', 'front_door')
device('vacuum.robot', 'vacuum')
device('binary_sensor.bathroom_motion', 'motion')
device('button.litter_box_scoop', 'litter_box')
device('binary_sensor.smoke', 'smoke')
device('binary_sensor.bathroom_moisture', 'leak')

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
      camera: { position: [0.4, 3.8, 1.6], target: [2.3, 0.3, -1.7] },
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      area_id: 'kitchen',
      points: KITCHEN,
      floor: { material: 'wood' },
      camera: { position: [2.1, 4.0, -0.6], target: [2.1, 0.3, -4.5] },
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
  camera: { position: [-0.3, 5.0, 3.6], target: [3.9, 0.3, -2.8] },
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
  'cover.kitchen_blind': 'Kitchen blind',
  'media_player.living_tv': 'Living room TV',
  'climate.living_room': 'Thermostat',
  'switch.towel_rail': 'Towel rail',
  'switch.coffee_machine': 'Coffee machine',
  'switch.kettle': 'Kettle',
  'fan.ceiling_fan': 'Ceiling fan',
  'cover.projector_screen': 'Projector screen',
  'lock.front_door': 'Front door lock',
  'binary_sensor.front_door': 'Front door',
  'vacuum.robot': 'Robot vacuum',
  'binary_sensor.bathroom_motion': 'Bathroom motion',
  'button.litter_box_scoop': 'Scoop',
  'binary_sensor.smoke': 'Smoke detector',
  'binary_sensor.bathroom_moisture': 'Bathroom leak',
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
      } else {
        entity.state = 'on'
        a.brightness = 255
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
