import type { DeviceConfig, HomeAssistant } from '#/types.ts'
import {
  type IconDefinition,
  faBars,
  faCircleDot,
  faDoorOpen,
  faDroplet,
  faFan,
  faFire,
  faLightbulb,
  faLock,
  faMinus,
  faPersonWalking,
  faPlug,
  faRobot,
  faSun,
  faTemperatureHalf,
  faToggleOn,
  faTv,
  faVideo,
  faVolumeHigh,
  faWarehouse,
  faWind,
  faWindowMaximize,
} from '@fortawesome/free-solid-svg-icons'

// How a placed entity looks. Strip-like types carry a length.
export type DeviceType = {
  id: string
  label: string
  icon: IconDefinition
  hasLength?: boolean
  defaultLength?: number
}

// Types per entity domain. The first one is the default.
export const DEVICE_TYPES: Record<string, DeviceType[]> = {
  light: [
    { id: 'ceiling', label: 'Ceiling light', icon: faSun },
    { id: 'ceiling_lamp', label: 'Ceiling lamp', icon: faLightbulb },
    { id: 'floor_lamp', label: 'Floor lamp', icon: faLightbulb },
    { id: 'table_lamp', label: 'Table lamp', icon: faLightbulb },
    { id: 'led_strip', label: 'LED strip', icon: faMinus, hasLength: true, defaultLength: 1 },
    { id: 'wall', label: 'Wall light', icon: faLightbulb },
    { id: 'spot', label: 'Spot', icon: faCircleDot },
  ],
  switch: [
    { id: 'plug', label: 'Plug', icon: faPlug },
    { id: 'switch', label: 'Switch', icon: faToggleOn },
  ],
  cover: [
    { id: 'blind', label: 'Blind', icon: faBars, hasLength: true, defaultLength: 1.2 },
    { id: 'curtain', label: 'Curtain', icon: faWindowMaximize, hasLength: true, defaultLength: 1.5 },
    { id: 'garage', label: 'Garage door', icon: faWarehouse, hasLength: true, defaultLength: 2.5 },
  ],
  media_player: [
    { id: 'tv', label: 'TV', icon: faTv, hasLength: true, defaultLength: 1.2 },
    { id: 'speaker', label: 'Speaker', icon: faVolumeHigh },
  ],
  fan: [
    { id: 'ceiling_fan', label: 'Ceiling fan', icon: faFan },
    { id: 'standing_fan', label: 'Standing fan', icon: faFan },
  ],
  climate: [
    { id: 'radiator', label: 'Radiator', icon: faFire, hasLength: true, defaultLength: 0.8 },
    { id: 'ac', label: 'Air conditioner', icon: faWind, hasLength: true, defaultLength: 0.9 },
  ],
  humidifier: [{ id: 'humidifier', label: 'Humidifier', icon: faDroplet }],
  lock: [{ id: 'lock', label: 'Lock', icon: faLock }],
  camera: [{ id: 'camera', label: 'Camera', icon: faVideo }],
  vacuum: [{ id: 'vacuum', label: 'Vacuum', icon: faRobot }],
  sensor: [
    { id: 'temperature', label: 'Temperature', icon: faTemperatureHalf },
    { id: 'humidity', label: 'Humidity', icon: faDroplet },
  ],
  binary_sensor: [
    { id: 'door', label: 'Door', icon: faDoorOpen, hasLength: true, defaultLength: 0.8 },
    { id: 'window', label: 'Window', icon: faWindowMaximize, hasLength: true, defaultLength: 1 },
    { id: 'motion', label: 'Motion', icon: faPersonWalking },
  ],
}

// Sensors are noisy. Only these device classes are offered.
const SENSOR_CLASSES: Record<string, Record<string, string>> = {
  sensor: { temperature: 'temperature', humidity: 'humidity' },
  binary_sensor: { door: 'door', window: 'window', opening: 'door', motion: 'motion', occupancy: 'motion' },
}

export const domainOf = (entityId: string) => entityId.split('.')[0]

export function typesFor(entityId: string) {
  return DEVICE_TYPES[domainOf(entityId)] ?? []
}

export function deviceType(device: Pick<DeviceConfig, 'entity_id' | 'type'>): DeviceType | undefined {
  const types = typesFor(device.entity_id)
  return types.find(t => t.id === device.type) ?? types[0]
}

export type EntityInfo = {
  entity_id: string
  name: string
  domain: string
  // Type suggested by the entity's device class, when any.
  suggestedType?: string
}

export function entityName(hass: HomeAssistant, entityId: string) {
  const state = hass.states[entityId]
  const friendly = state?.attributes.friendly_name
  if (typeof friendly === 'string' && friendly) return friendly
  return hass.entities?.[entityId]?.name ?? entityId
}

// Entities that can be placed in a room, from the room's Home Assistant area.
// An entity belongs to an area directly or through its device.
export function entitiesInArea(hass: HomeAssistant, areaId: string): EntityInfo[] {
  const out: EntityInfo[] = []
  for (const entry of Object.values(hass.entities ?? {})) {
    if (entry.hidden || entry.entity_category) continue
    const area = entry.area_id ?? (entry.device_id ? hass.devices?.[entry.device_id]?.area_id : null)
    if (area !== areaId) continue
    const domain = domainOf(entry.entity_id)
    if (!DEVICE_TYPES[domain]) continue
    let suggestedType: string | undefined
    const classes = SENSOR_CLASSES[domain]
    if (classes) {
      const deviceClass = hass.states[entry.entity_id]?.attributes.device_class
      suggestedType = typeof deviceClass === 'string' ? classes[deviceClass] : undefined
      if (!suggestedType) continue
    }
    out.push({ entity_id: entry.entity_id, name: entityName(hass, entry.entity_id), domain, suggestedType })
  }
  return out.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name))
}
