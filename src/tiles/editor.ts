import { PHOSPHOR_ICONS, phosphor } from '#/tiles/icons.ts'

// The visual editors of the tiles, as forms Home Assistant draws itself
// from a schema.

type Field = { name: string; required?: boolean; selector?: Record<string, unknown>; [key: string]: unknown }
export type Extra = 'invert' | 'battery_entity' | 'tap_behavior' | 'camera'

const LABELS: Record<string, string> = {
  entity: 'Entity',
  name: 'Name',
  icon: 'Icon',
  size: 'Size',
  area: 'Area',
  room_filter: 'With a room in view',
  tap_action: 'Tap action',
  hold_action: 'Hold action',
  haptic: 'Vibrate on tap',
  color: 'Color while on',
  state_text: 'State text',
  invert: 'Inverted',
  battery_entity: 'Battery sensor',
  tap_behavior: 'Tap opens',
  camera_view: 'Camera view',
  aspect_ratio: 'Aspect ratio',
  title: 'Title',
  appearance: 'Appearance',
  interactions: 'Interactions',
}

const HELPERS: Record<string, string> = {
  area: 'The room filter uses the entity area when this is empty',
  color: 'Any CSS color, like #ffb340',
  state_text: 'Replaces the line under the name',
  invert: 'For a screen that comes down to open',
  battery_entity: 'Found on the same device when empty',
  aspect_ratio: 'Width to height, like 16:9',
  title: 'The area name when empty',
}

const ROOM_FILTER: Field = {
  name: 'room_filter',
  selector: {
    select: {
      mode: 'dropdown',
      options: [
        { value: 'hide', label: 'Show it only in its own area (or always, with no area)' },
        { value: 'show', label: 'Always show it' },
        { value: 'room', label: 'Show it only in its own room' },
        { value: 'home', label: 'Show it only with the whole home in view' },
      ],
    },
  },
}

const EXTRAS: Record<Extra, Field[]> = {
  invert: [{ name: 'invert', selector: { boolean: {} } }],
  battery_entity: [
    { name: 'battery_entity', selector: { entity: { filter: { domain: 'sensor', device_class: 'battery' } } } },
  ],
  tap_behavior: [
    {
      name: 'tap_behavior',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'menu', label: 'A menu of the options' },
            { value: 'cycle', label: 'The next option' },
          ],
        },
      },
    },
  ],
  camera: [
    {
      name: 'camera_view',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'auto', label: 'Snapshots' },
            { value: 'live', label: 'Live' },
          ],
        },
      },
    },
    { name: 'aspect_ratio', selector: { text: {} } },
  ],
}

function form(schema: Field[]) {
  return {
    schema,
    computeLabel: (field: Field) => LABELS[field.name] ?? field.name,
    computeHelper: (field: Field) => HELPERS[field.name],
  }
}

export function tileForm(domains: string[] | 'any', extras: Extra[] = []) {
  const sized = !extras.includes('camera')
  const filter = domains === 'any' ? {} : { filter: { domain: domains } }
  return form([
    { name: 'entity', required: true, selector: { entity: filter } },
    {
      name: 'appearance',
      type: 'expandable',
      flatten: true,
      expanded: true,
      schema: [
        {
          name: '',
          type: 'grid',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            ...(sized
              ? [
                  {
                    name: 'size',
                    selector: {
                      select: {
                        mode: 'dropdown',
                        options: [
                          { value: 'small', label: 'Small' },
                          { value: 'wide', label: 'Wide' },
                        ],
                      },
                    },
                  },
                ]
              : []),
            { name: 'color', selector: { text: {} } },
          ],
        },
        { name: 'state_text', selector: { text: {} } },
        ...extras.flatMap(extra => EXTRAS[extra]),
        { name: 'area', selector: { area: {} } },
        ROOM_FILTER,
      ],
    },
    {
      name: 'interactions',
      type: 'expandable',
      flatten: true,
      schema: [
        { name: 'tap_action', selector: { ui_action: {} } },
        { name: 'hold_action', selector: { ui_action: {} } },
        { name: 'haptic', selector: { boolean: {} } },
      ],
    },
  ])
}

export function titleForm() {
  return form([{ name: 'title', selector: { text: {} } }, { name: 'area', selector: { area: {} } }, ROOM_FILTER])
}

type IconSet = {
  getIcon: (name: string) => Promise<{ path: string; viewBox?: string }>
  getIconList?: () => Promise<{ name: string }[]>
}

declare global {
  interface Window {
    customIcons?: Record<string, IconSet>
  }
}

// The bundled Phosphor icons, offered as ph: in Home Assistant's icon
// picker and its own icon element, unless something else already took the
// name. Each is a single path, so it draws as Home Assistant draws its own.
export function registerIcons() {
  window.customIcons ??= {}
  if (window.customIcons.ph) return
  const path = (name: string) => phosphor(name, false)?.match(/ d="([^"]+)"/)?.[1] ?? ''
  window.customIcons.ph = {
    getIcon: async name => ({ path: path(name), viewBox: '0 0 256 256' }),
    getIconList: async () => PHOSPHOR_ICONS.map(name => ({ name })),
  }
}
