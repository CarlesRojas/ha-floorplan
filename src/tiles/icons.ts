// The Phosphor icons the tiles can show, as `ph:<name>`. Only these are
// bundled: the whole set would weigh several megabytes. Each comes in its
// regular weight, for a tile that is off, and filled, for one that is on.
// To add one, add its name to both lists below.
const REGULAR = import.meta.glob<string>(
  '/node_modules/@phosphor-icons/core/assets/regular/{armchair,arrow-line-down,arrow-line-up,bathtub,battery-charging,battery-empty,battery-full,battery-high,battery-low,battery-medium,bed,bell,broom,camera,caret-down,caret-left,caret-right,caret-up,cat,check,circle,clock,cooking-pot,couch,cursor-click,desktop,door,door-open,drop,fan,film-strip,fire,fork-knife,garage,hand-tap,heart,house,house-line,lamp,lamp-pendant,lightbulb,lightbulb-filament,lightning,list,list-bullets,list-checks,lock,lock-open,map-trifold,monitor,moon,oven,pause,paw-print,plant,play,plug,plugs,popcorn,potted-plant,power,projector-screen,question,robot,rows,security-camera,shower,sliders,snowflake,sparkle,spray-bottle,square-half-bottom,star,stop,sun,television,thermometer,timer,toggle-left,toggle-right,toilet,tree,video-camera,warning,wind,x}.svg',
  { query: '?raw', import: 'default', eager: true },
)
const FILL = import.meta.glob<string>(
  '/node_modules/@phosphor-icons/core/assets/fill/{armchair,arrow-line-down,arrow-line-up,bathtub,battery-charging,battery-empty,battery-full,battery-high,battery-low,battery-medium,bed,bell,broom,camera,caret-down,caret-left,caret-right,caret-up,cat,check,circle,clock,cooking-pot,couch,cursor-click,desktop,door,door-open,drop,fan,film-strip,fire,fork-knife,garage,hand-tap,heart,house,house-line,lamp,lamp-pendant,lightbulb,lightbulb-filament,lightning,list,list-bullets,list-checks,lock,lock-open,map-trifold,monitor,moon,oven,pause,paw-print,plant,play,plug,plugs,popcorn,potted-plant,power,projector-screen,question,robot,rows,security-camera,shower,sliders,snowflake,sparkle,spray-bottle,square-half-bottom,star,stop,sun,television,thermometer,timer,toggle-left,toggle-right,toilet,tree,video-camera,warning,wind,x}-fill.svg',
  { query: '?raw', import: 'default', eager: true },
)

const byName = (files: Record<string, string>) =>
  new Map(Object.entries(files).map(([path, svg]) => [path.replace(/^.*\/|(-fill)?\.svg$/g, ''), svg]))
const regular = byName(REGULAR)
const fill = byName(FILL)

// Every name that can be written after `ph:`.
export const PHOSPHOR_ICONS = [...regular.keys()].sort()

// The SVG for a Phosphor icon, filled while its tile is on.
export function phosphor(name: string, on: boolean) {
  // A name that asks for a weight itself keeps it whatever the state.
  if (name.endsWith('-fill')) return fill.get(name.slice(0, -5))
  return (on ? fill : regular).get(name)
}

// The icon a tile shows when its config names none.
export function defaultIcon(entityId: string | undefined, deviceClass?: unknown) {
  const domain = entityId?.split('.')[0]
  switch (domain) {
    case 'light':
      return 'ph:lightbulb'
    case 'switch':
      return deviceClass === 'outlet' ? 'ph:plug' : 'ph:power'
    case 'input_boolean':
      return 'ph:toggle-right'
    case 'button':
    case 'input_button':
      return 'ph:hand-tap'
    case 'script':
      return 'ph:play'
    case 'scene':
      return 'ph:sparkle'
    case 'cover':
      if (deviceClass === 'garage') return 'ph:garage'
      if (deviceClass === 'door' || deviceClass === 'gate') return 'ph:door'
      return 'ph:rows'
    case 'vacuum':
      return 'ph:robot'
    case 'select':
    case 'input_select':
      return 'ph:list-bullets'
    case 'camera':
      return 'ph:video-camera'
    default:
      return 'ph:circle'
  }
}
