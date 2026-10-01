import { describe, test, expect, beforeAll, afterAll } from 'bun:test'

import { run, trackNode, setupTestPage, teardownTestPage } from '../helpers.ts'

describe('diff', () => {
  let testFrameId: string
  let originalFrameId: string
  let modifiedFrameId: string

  beforeAll(async () => {
    await setupTestPage('diff')
    // This setup makes 11+ CLI calls, needs more time

    // Create container frame
    const container = (await run(
      'create frame --x 0 --y 0 --width 800 --height 400 --name "Diff Tests" --json'
    )) as { id: string }
    testFrameId = container.id
    trackNode(testFrameId)

    // Create original frame with children
    const original = (await run(
      `create frame --x 10 --y 10 --width 200 --height 150 --fill "#FFFFFF" --name "Original" --parent "${testFrameId}" --json`
    )) as { id: string }
    originalFrameId = original.id
    trackNode(originalFrameId)

    // Add children to original
    const rect1 = (await run(
      `create rect --x 10 --y 10 --width 50 --height 50 --fill "#FF0000" --name "RedBox" --parent "${originalFrameId}" --json`
    )) as { id: string }
    trackNode(rect1.id)

    const rect2 = (await run(
      `create rect --x 70 --y 10 --width 50 --height 50 --fill "#00FF00" --name "GreenBox" --parent "${originalFrameId}" --json`
    )) as { id: string }
    trackNode(rect2.id)

    // Clone and modify
    const modified = (await run(`node clone ${originalFrameId} --json`)) as { id: string }
    modifiedFrameId = modified.id
    trackNode(modifiedFrameId)

    // Move modified frame
    await run(`node move ${modifiedFrameId} --x 250 --y 10`)
    await run(`node rename ${modifiedFrameId} "Modified"`)

    // Get children of modified frame
    const modifiedChildren = (await run(`node children ${modifiedFrameId} --json`)) as {
      id: string
      name: string
    }[]
    const modifiedRedBox = modifiedChildren.find((c) => c.name === 'RedBox')
    const modifiedGreenBox = modifiedChildren.find((c) => c.name === 'GreenBox')

    // Modify properties
    if (modifiedRedBox) {
      await run(`set fill ${modifiedRedBox.id} "#0000FF"`) // Red -> Blue
      await run(`set opacity ${modifiedRedBox.id} 0.5`)
      trackNode(modifiedRedBox.id)
    }
    if (modifiedGreenBox) {
      await run(`node resize ${modifiedGreenBox.id} --width 80 --height 80`)
      trackNode(modifiedGreenBox.id)
    }
  }, 60000) // 60s timeout for setup

  afterAll(async () => {
    await teardownTestPage()
  })

  describe('diff create', () => {
    test('detects fill color change', async () => {
      const output = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string
      expect(output).toContain('-fill: #FF0000')
      expect(output).toContain('+fill: #0000FF')
    })

    test('detects opacity change', async () => {
      const output = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string
      expect(output).toContain('+opacity: 0.5')
    })

    test('detects size change', async () => {
      const output = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string
      expect(output).toContain('-size: 50 50')
      expect(output).toContain('+size: 80 80')
    })

    test('includes node IDs in patch', async () => {
      const output = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string
      expect(output).toMatch(/#\d+:\d+/)
    })

    test('uses unified diff format', async () => {
      const output = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string
      expect(output).toContain('---')
      expect(output).toContain('+++')
      expect(output).toContain('@@')
    })
  })

  describe('diff apply', () => {
    test('dry run shows pending changes', async () => {
      const patch = (await run(
        `diff create --from ${originalFrameId} --to ${modifiedFrameId}`,
        false
      )) as string

      // Write patch to temp file and apply with dry run
      const tempFile = `/tmp/figma-test-patch-${Date.now()}.diff`
      await Bun.write(tempFile, patch)

      const output = (await run(`diff apply ${tempFile} --dry-run`, false)) as string
      expect(output).toContain('changes would be applied')

      // Cleanup
      ;(await Bun.file(tempFile).exists()) && (await Bun.write(tempFile, ''))
    })

    test('validates old values before applying', async () => {
      // Create test node with known state
      const testRect = (await run(
        `create rect --x 450 --y 10 --width 50 --height 50 --fill "#123456" --name "ValidateTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(testRect.id)

      // Create a patch with wrong old fill value
      const badPatch = `--- /ValidateTest #${testRect.id}
+++ /ValidateTest #${testRect.id}
@@ -1,4 +1,4 @@
 type: RECTANGLE
 size: 50 50
 pos: 450 10
-fill: #WRONG
+fill: #ABCDEF
`
      const tempFile = `/tmp/figma-bad-patch-${Date.now()}.diff`
      await Bun.write(tempFile, badPatch)

      const output = (await run(`diff apply ${tempFile}`, false)) as string
      expect(output).toContain('failed')
    })

    test('force flag skips validation', async () => {
      // Create original test node
      const testRect = (await run(
        `create rect --x 500 --y 10 --width 50 --height 50 --fill "#AAAAAA" --name "ForceTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(testRect.id)

      // Patch with wrong old value but correct target
      const patch = `--- /ForceTest #${testRect.id}
+++ /ForceTest #${testRect.id}
@@ -1,4 +1,4 @@
 type: RECTANGLE
 size: 50 50
 pos: 500 10
-fill: #WRONG
+fill: #BBBBBB
`
      const tempFile = `/tmp/figma-force-patch-${Date.now()}.diff`
      await Bun.write(tempFile, patch)

      const output = (await run(`diff apply ${tempFile} --force`, false)) as string
      expect(output).toContain('applied')

      // Verify it was applied
      const node = (await run(`node get ${testRect.id} --json`)) as { fills: { color: string }[] }
      expect(node.fills[0]!.color).toBe('#BBBBBB')
    })

    test('applies multiple changes from patch', async () => {
      // Create two test nodes
      const rect1 = (await run(
        `create rect --x 600 --y 10 --width 30 --height 30 --fill "#111111" --name "Multi1" --parent "${testFrameId}" --json`
      )) as { id: string }
      const rect2 = (await run(
        `create rect --x 650 --y 10 --width 30 --height 30 --fill "#222222" --name "Multi2" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(rect1.id)
      trackNode(rect2.id)

      // strokeWeight: 1 is the default for rectangles in Figma
      const patch = `--- /Multi1 #${rect1.id}
+++ /Multi1 #${rect1.id}
@@ -1,5 +1,5 @@
 type: RECTANGLE
 size: 30 30
 pos: 600 10
-fill: #111111
+fill: #AAAAAA
 strokeWeight: 1
--- /Multi2 #${rect2.id}
+++ /Multi2 #${rect2.id}
@@ -1,5 +1,5 @@
 type: RECTANGLE
 size: 30 30
 pos: 650 10
-fill: #222222
+fill: #BBBBBB
 strokeWeight: 1
`
      const tempFile = `/tmp/figma-multi-patch-${Date.now()}.diff`
      await Bun.write(tempFile, patch)

      const output = (await run(`diff apply ${tempFile}`, false)) as string
      expect(output).toContain('2 applied')

      // Verify both were applied
      const node1 = (await run(`node get ${rect1.id} --json`)) as { fills: { color: string }[] }
      const node2 = (await run(`node get ${rect2.id} --json`)) as { fills: { color: string }[] }
      expect(node1.fills[0]!.color).toBe('#AAAAAA')
      expect(node2.fills[0]!.color).toBe('#BBBBBB')
    })

    test('applies patch from file argument', async () => {
      const testRect = (await run(
        `create rect --x 700 --y 10 --width 40 --height 40 --fill "#CCCCCC" --name "FileTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(testRect.id)

      // strokeWeight: 1 is the default for rectangles in Figma
      const patch = `--- /FileTest #${testRect.id}
+++ /FileTest #${testRect.id}
@@ -1,5 +1,5 @@
 type: RECTANGLE
 size: 40 40
 pos: 700 10
-fill: #CCCCCC
+fill: #DDDDDD
 strokeWeight: 1
`
      const tempFile = `/tmp/figma-file-patch-${Date.now()}.diff`
      await Bun.write(tempFile, patch)

      const output = (await run(`diff apply ${tempFile}`, false)) as string
      expect(output).toContain('applied')

      const node = (await run(`node get ${testRect.id} --json`)) as { fills: { color: string }[] }
      expect(node.fills[0]!.color).toBe('#DDDDDD')
    })
  })

  describe('diff show', () => {
    test('shows diff for proposed changes', async () => {
      const testRect = (await run(
        `create rect --x 750 --y 10 --width 40 --height 40 --fill "#EEEEEE" --name "ShowTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(testRect.id)

      const output = (await run(
        `diff show ${testRect.id} --props '{"fill": "#FFFFFF", "opacity": 0.8}'`,
        false
      )) as string
      expect(output).toContain('-fill: #EEEEEE')
      expect(output).toContain('+fill: #FFFFFF')
      expect(output).toContain('+opacity: 0.8')
    })
  })

  describe('diff jsx', () => {
    test('shows JSX diff between two nodes', async () => {
      // Create two similar frames with differences
      const frame1 = (await run(
        `create frame --x 800 --y 10 --width 100 --height 50 --fill "#3B82F6" --radius 8 --name "JsxDiff1" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(frame1.id)

      const frame2 = (await run(
        `create frame --x 920 --y 10 --width 120 --height 60 --fill "#EF4444" --radius 12 --name "JsxDiff2" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(frame2.id)

      const output = (await run(`diff jsx ${frame1.id} ${frame2.id}`, false)) as string

      // Should show JSX attribute differences
      expect(output).toContain('-')
      expect(output).toContain('+')
      expect(output).toContain('w={')
      expect(output).toContain('bg=')
    })

    test('reports no differences for identical nodes', async () => {
      const frame = (await run(
        `create frame --x 1050 --y 10 --width 80 --height 40 --fill "#10B981" --name "JsxSame" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(frame.id)

      const output = (await run(`diff jsx ${frame.id} ${frame.id}`, false)) as string
      expect(output).toContain('No differences')
    })
  })

  describe('diff create - extended properties', () => {
    test('detects individual corner radii changes', async () => {
      // Create original frame, clone it, then modify the clone
      const original = (await run(
        `create frame --x 1100 --y 10 --width 100 --height 100 --fill "#FFFFFF" --name "RadiiTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(original.id)

      const modified = (await run(`node clone ${original.id} --json`)) as { id: string }
      trackNode(modified.id)
      await run(`node move ${modified.id} --x 1220 --y 10`)

      // Set individual corner radii on modified (different values for each corner)
      await run(`set radius ${modified.id} --top-left 8 --top-right 16 --bottom-right 4 --bottom-left 0`)

      const output = (await run(
        `diff create --from ${original.id} --to ${modified.id}`,
        false
      )) as string
      expect(output).toContain('+radii: 8 16 4 0')
    })

    test('detects rotation changes', async () => {
      const original = (await run(
        `create rect --x 1340 --y 10 --width 50 --height 50 --fill "#FF0000" --name "RotationTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(original.id)

      const modified = (await run(`node clone ${original.id} --json`)) as { id: string }
      trackNode(modified.id)
      await run(`node move ${modified.id} --x 1400 --y 10`)

      await run(`set rotation ${modified.id} --angle 45`)

      const output = (await run(
        `diff create --from ${original.id} --to ${modified.id}`,
        false
      )) as string
      expect(output).toContain('+rotation: 45')
    })

    test('detects blend mode changes', async () => {
      const original = (await run(
        `create rect --x 1460 --y 10 --width 50 --height 50 --fill "#00FF00" --name "BlendTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(original.id)

      const modified = (await run(`node clone ${original.id} --json`)) as { id: string }
      trackNode(modified.id)
      await run(`node move ${modified.id} --x 1520 --y 10`)

      await run(`set blend ${modified.id} MULTIPLY`)

      const output = (await run(
        `diff create --from ${original.id} --to ${modified.id}`,
        false
      )) as string
      expect(output).toContain('+blendMode: MULTIPLY')
    })

    test('detects effect changes (shadow)', async () => {
      const original = (await run(
        `create rect --x 1580 --y 10 --width 50 --height 50 --fill "#0000FF" --name "ShadowTest" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(original.id)

      const modified = (await run(`node clone ${original.id} --json`)) as { id: string }
      trackNode(modified.id)
      await run(`node move ${modified.id} --x 1640 --y 10`)

      await run(`set effect ${modified.id} --type DROP_SHADOW --offset-x 4 --offset-y 4 --radius 8 --color "#00000040"`)

      const output = (await run(
        `diff create --from ${original.id} --to ${modified.id}`,
        false
      )) as string
      expect(output).toContain('+effect: DROP_SHADOW')
    })
  })

  describe('diff visual', () => {
    test('creates visual diff between two nodes', async () => {
      // Create two identical frames
      const frame1 = (await run(
        `create frame --x 1700 --y 10 --width 100 --height 100 --fill "#FF0000" --name "VisualDiff1" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(frame1.id)

      const frame2 = (await run(
        `create frame --x 1820 --y 10 --width 100 --height 100 --fill "#FF0000" --name "VisualDiff2" --parent "${testFrameId}" --json`
      )) as { id: string }
      trackNode(frame2.id)

      const outputPath = `/tmp/figma-visual-diff-${Date.now()}.png`
      const output = (await run(
        `diff visual --from ${frame1.id} --to ${frame2.id} --output ${outputPath}`,
        false
      )) as string

      expect(output).toContain('0 pixels differ')
      expect(output).toContain('Saved to')

      // Cleanup
      const fs = await import('fs')
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    })

    test('detects visual differences', async () => {
      // Create two rectangles with different colors (without parent to ensure proper export)
      const rect1 = (await run(
        `create rect --x 2000 --y 500 --width 100 --height 100 --fill "#FF0000" --name "VisualDiffRed" --json`
      )) as { id: string }
      trackNode(rect1.id)

      const rect2 = (await run(
        `create rect --x 2200 --y 500 --width 100 --height 100 --fill "#0000FF" --name "VisualDiffBlue" --json`
      )) as { id: string }
      trackNode(rect2.id)

      const outputPath = `/tmp/figma-visual-diff-color-${Date.now()}.png`
      const output = (await run(
        `diff visual --from ${rect1.id} --to ${rect2.id} --output ${outputPath}`,
        false
      )) as string

      // Should detect differences (red vs blue)
      expect(output).toMatch(/\d+ pixels differ/)
      expect(output).not.toMatch(/^0 pixels differ/)

      // Cleanup
      const fs = await import('fs')
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    })
  })
})
