import { describe, test, expect, beforeAll, afterAll } from 'bun:test'

import { run, trackNode, setupTestPage, teardownTestPage } from '../helpers.ts'

describe('arrange', () => {
  let ids: string[] = []

  beforeAll(async () => {
    await setupTestPage('arrange')
    // Create 4 frames at the same position (simulates agent behavior)
    for (let i = 0; i < 4; i++) {
      const frame = (await run(
        `create frame --x 0 --y 0 --width ${200 + i * 50} --height ${150 + i * 30} --name "Frame${i}" --json`
      )) as { id: string }
      trackNode(frame.id)
      ids.push(frame.id)
    }
  })

  afterAll(async () => {
    ids = []
    await teardownTestPage()
  })

  test('grid arranges nodes in a grid', async () => {
    const result = (await run(`arrange "${ids.join(' ')}" --mode grid --gap 40 --json`)) as {
      id: string
      x: number
      y: number
    }[]
    expect(result).toHaveLength(4)
    // 4 nodes -> 2x2 grid
    expect(result[0]!.x).toBe(0)
    expect(result[0]!.y).toBe(0)
    expect(result[1]!.x).toBeGreaterThan(0)
    expect(result[1]!.y).toBe(0)
    expect(result[2]!.x).toBe(0)
    expect(result[2]!.y).toBeGreaterThan(0)
  })

  test('row arranges nodes horizontally', async () => {
    const result = (await run(`arrange "${ids.join(' ')}" --mode row --gap 20 --json`)) as {
      id: string
      x: number
      y: number
    }[]
    expect(result).toHaveLength(4)
    for (const node of result) {
      expect(node.y).toBe(0)
    }
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.x).toBeGreaterThan(result[i - 1]!.x)
    }
  })

  test('column arranges nodes vertically', async () => {
    const result = (await run(`arrange "${ids.join(' ')}" --mode column --gap 20 --json`)) as {
      id: string
      x: number
      y: number
    }[]
    expect(result).toHaveLength(4)
    for (const node of result) {
      expect(node.x).toBe(0)
    }
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.y).toBeGreaterThan(result[i - 1]!.y)
    }
  })

  test('squarify arranges using treemap packing', async () => {
    const result = (await run(
      `arrange "${ids.join(' ')}" --mode squarify --gap 30 --json`
    )) as { id: string; x: number; y: number }[]
    expect(result).toHaveLength(4)
    // Nodes should be spread out, not all at origin
    const positions = new Set(result.map((n) => `${n.x},${n.y}`))
    expect(positions.size).toBeGreaterThan(1)
  })

  test('binary arranges using balanced split', async () => {
    const result = (await run(
      `arrange "${ids.join(' ')}" --mode binary --gap 30 --json`
    )) as { id: string; x: number; y: number }[]
    expect(result).toHaveLength(4)
    const positions = new Set(result.map((n) => `${n.x},${n.y}`))
    expect(positions.size).toBeGreaterThan(1)
  })

  test('grid with --cols sets column count', async () => {
    const result = (await run(
      `arrange "${ids.join(' ')}" --mode grid --cols 4 --gap 20 --json`
    )) as { id: string; x: number; y: number }[]
    // 4 cols -> single row
    for (const node of result) {
      expect(node.y).toBe(0)
    }
  })

  test('arranges all page children when no IDs given', async () => {
    const result = (await run('arrange --mode row --gap 20 --json')) as {
      id: string
      x: number
      y: number
    }[]
    expect(result.length).toBeGreaterThanOrEqual(4)
  })
})
