import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'

// The card draws a frame only when something in it has changed: a light
// switching, the camera moving, a door swinging. A room that sits still
// costs nothing, which on a tablet on the wall is most of the day. Whatever
// changes the scene by hand, in a frame callback rather than through React,
// has to ask for the next frame itself, and these are the two ways to ask.

// Keeps frames coming for as long as `active`: for a fan that spins, a
// picture that plays, a flame that flickers. The first frame is asked for
// when it turns on, and the last one when it turns off, so what it leaves
// behind is drawn too.
export function useLive(active: boolean) {
  const invalidate = useThree(state => state.invalidate)
  useEffect(() => {
    invalidate()
  }, [active, invalidate])
  useFrame(() => {
    if (active) invalidate()
  })
}

// Asks for a frame at the top of every second, for a clock. A frame
// callback alone would never run while the room sits still.
export function useEverySecond() {
  const invalidate = useThree(state => state.invalidate)
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>
    const arm = () => {
      id = setTimeout(
        () => {
          invalidate()
          arm()
        },
        1000 - (Date.now() % 1000) + 5,
      )
    }
    arm()
    return () => clearTimeout(id)
  }, [invalidate])
}
