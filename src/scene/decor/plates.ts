import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, Vector3 } from 'three'

// Upholstered and molded plates, flat outlines given a thickness and bent
// round a vertical axis, for the backs of the office chairs, and shells
// molded from a grid of points.

// Adds points every centimeter along a straight edge, so a plate bends
// smoothly across its face rather than in one chord.
function edge(s: Shape, [x0, y0]: [number, number], [x1, y1]: [number, number]) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.01))
  for (let i = 1; i <= n; i++) s.lineTo(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)
}

// An outline `w0` wide at its foot and `w1` at its head, `h` tall, the foot's
// corners rounded `r0` and the head's `r1`, shrunk all round by `inset`. The
// middle of its foot is the origin and it rises along +y.
export function taperedOutline(w0: number, w1: number, h: number, r0: number, r1: number, inset = 0) {
  const a = w0 / 2 - inset
  const b = w1 / 2 - inset
  const top = h - inset
  const bottom = inset
  const rb = Math.max(r0 - inset, 0.0005)
  const rt = Math.max(r1 - inset, 0.0005)
  const s = new Shape()
  s.moveTo(-a + rb, bottom)
  edge(s, [-a + rb, bottom], [a - rb, bottom])
  s.absarc(a - rb, bottom + rb, rb, -Math.PI / 2, 0, false)
  edge(s, [a, bottom + rb], [b, top - rt])
  s.absarc(b - rt, top - rt, rt, 0, Math.PI / 2, false)
  edge(s, [b - rt, top], [-b + rt, top])
  s.absarc(-b + rt, top - rt, rt, Math.PI / 2, Math.PI, false)
  edge(s, [-b, top - rt], [-a, bottom + rb])
  s.absarc(-a + rb, bottom + rb, rb, Math.PI, Math.PI * 1.5, false)
  return s
}

// Bends a plate standing on the XY plane round a vertical axis `radius` in
// front of it, so its edges come forward and it is concave toward +z. Its
// normals turn with it.
export function bendAround(geo: BufferGeometry, radius: number) {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getX(i) / radius
    const r = radius - pos.getZ(i)
    const [c, s] = [Math.cos(t), Math.sin(t)]
    pos.setXYZ(i, r * s, pos.getY(i), radius - r * c)
    const [nx, nz] = [nor.getX(i), nor.getZ(i)]
    nor.setXYZ(i, nx * c - nz * s, nor.getY(i), nx * s + nz * c)
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
  return geo
}

// A plate `thick` deep with softened edges: `outline(inset)` gives its face,
// shrunk by the bevel so the plate keeps its size. Its back face is z 0, and
// it is bent round `bend` when that is given.
export function plate(outline: (inset: number) => Shape, thick: number, bend?: number, bevel = 0.006) {
  const b = Math.min(bevel, thick / 3)
  const geo = new ExtrudeGeometry(outline(b), {
    depth: thick - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 24,
  })
  geo.translate(0, 0, b)
  return bend ? bendAround(geo, bend) : geo
}

// A molded shell from a grid of points on its face: rows run along the
// shell and columns across it. The face is the side the columns and rows
// turn to the left of, and the shell is `thick` deep behind it, with a
// square rim all round, so thickness stays the same however the grid is
// laid out.
export function thicken(grid: Vector3[][], thick: number) {
  const rows = grid.length
  const cols = grid[0].length
  const at = (i: number, j: number) => grid[Math.min(Math.max(i, 0), rows - 1)][Math.min(Math.max(j, 0), cols - 1)]
  const normals = grid.map((row, i) =>
    row.map((_, j) => {
      const across = at(i, j + 1).clone().sub(at(i, j - 1))
      const along = at(i + 1, j).clone().sub(at(i - 1, j))
      return across.cross(along).normalize()
    }),
  )
  const points: Vector3[] = []
  const shading: Vector3[] = []
  const index: number[] = []
  const add = (p: Vector3, n: Vector3) => {
    shading.push(n)
    return points.push(p) - 1
  }
  // A triangle wound so it faces along `n`.
  const face = (a: number, b: number, c: number, n: Vector3) => {
    const ab = points[b].clone().sub(points[a])
    const ac = points[c].clone().sub(points[a])
    if (ab.cross(ac).dot(n) >= 0) index.push(a, b, c)
    else index.push(a, c, b)
  }
  const behind = (i: number, j: number) => grid[i][j].clone().addScaledVector(normals[i][j], -thick)
  const front = grid.map((row, i) => row.map((p, j) => add(p, normals[i][j])))
  const back = grid.map((row, i) => row.map((_, j) => add(behind(i, j), normals[i][j].clone().negate())))
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const n = normals[i][j].clone().add(normals[i + 1][j + 1])
      for (const [side, s] of [
        [front, n],
        [back, n.clone().negate()],
      ] as const) {
        face(side[i][j], side[i][j + 1], side[i + 1][j + 1], s)
        face(side[i][j], side[i + 1][j + 1], side[i + 1][j], s)
      }
    }
  }
  // The rim, once round the edge of the grid.
  const loop: [number, number][] = []
  for (let j = 0; j < cols; j++) loop.push([0, j])
  for (let i = 1; i < rows; i++) loop.push([i, cols - 1])
  for (let j = cols - 2; j >= 0; j--) loop.push([rows - 1, j])
  for (let i = rows - 2; i > 0; i--) loop.push([i, 0])
  const rim = loop.map(([i, j]) => {
    // Out is away from the neighbour inside the grid, along the face.
    const inner = at(i === 0 ? 1 : i === rows - 1 ? rows - 2 : i, j === 0 ? 1 : j === cols - 1 ? cols - 2 : j)
    const n = normals[i][j]
    const out = grid[i][j].clone().sub(inner)
    out.addScaledVector(n, -out.dot(n)).normalize()
    return { top: add(grid[i][j], out), bottom: add(behind(i, j), out), out }
  })
  rim.forEach((a, k) => {
    const b = rim[(k + 1) % rim.length]
    const out = a.out.clone().add(b.out)
    face(a.top, b.top, b.bottom, out)
    face(a.top, b.bottom, a.bottom, out)
  })
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(points.flatMap(p => [p.x, p.y, p.z]), 3))
  geo.setAttribute('normal', new Float32BufferAttribute(shading.flatMap(n => [n.x, n.y, n.z]), 3))
  geo.setIndex(index)
  return geo
}
