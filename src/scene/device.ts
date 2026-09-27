// A device with only a touch screen is taken to be a phone or a tablet,
// whose graphics are a fraction of a laptop's and which runs on a battery,
// so the costliest parts of the picture are scaled back on it.
export function coarseOnly(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches
}
