import { defineCommand } from 'citty'
import { writeFileSync } from 'fs'

import { sendCommand, handleError } from '../../client.ts'
import { fail, installHint } from '../../format.ts'

import type { ExportResult } from '../../types.ts'

async function loadPngDeps() {
  try {
    const [{ PNG }, { default: pixelmatch }] = await Promise.all([
      import('pngjs'),
      import('pixelmatch')
    ])
    return { PNG, pixelmatch }
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      console.error(
        `pngjs and pixelmatch are required for visual diff. Install them:\n\n  ${installHint('pngjs pixelmatch')}\n`
      )
      process.exit(1)
    }
    throw e
  }
}

export default defineCommand({
  meta: { description: 'Create visual diff between two nodes as PNG' },
  args: {
    from: { type: 'string', description: 'Source node ID', required: true },
    to: { type: 'string', description: 'Target node ID', required: true },
    output: { type: 'string', description: 'Output file path', required: true },
    scale: { type: 'string', description: 'Export scale (default: 1)' },
    threshold: { type: 'string', description: 'Color threshold 0-1 (default: 0.1)' }
  },
  async run({ args }) {
    try {
      const { PNG, pixelmatch } = await loadPngDeps()

      const scale = args.scale ? Number(args.scale) : 1
      const threshold = args.threshold ? Number(args.threshold) : 0.1

      // Execute sequentially to avoid parallel WebSocket issues
      const fromResult = (await sendCommand('export-node', {
        id: args.from,
        format: 'PNG',
        scale
      })) as ExportResult

      const toResult = (await sendCommand('export-node', {
        id: args.to,
        format: 'PNG',
        scale
      })) as ExportResult

      if (!fromResult?.data || !toResult?.data) {
        console.error(fail('Could not export nodes'))
        process.exit(1)
      }

      const fromPng = PNG.sync.read(Buffer.from(fromResult.data, 'base64'))
      const toPng = PNG.sync.read(Buffer.from(toResult.data, 'base64'))

      if (fromPng.width !== toPng.width || fromPng.height !== toPng.height) {
        console.error(
          fail(
            `Size mismatch: ${fromPng.width}×${fromPng.height} vs ${toPng.width}×${toPng.height}`
          )
        )
        process.exit(1)
      }

      const { width, height } = fromPng
      const diff = new PNG({ width, height })

      const diffPixels = pixelmatch(fromPng.data, toPng.data, diff.data, width, height, {
        threshold
      })

      const totalPixels = width * height
      const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(2)

      writeFileSync(args.output, PNG.sync.write(diff))

      console.log(`${diffPixels} pixels differ (${diffPercent}%)`)
      console.log(`Saved to ${args.output}`)
      process.exit(0)
    } catch (e) {
      handleError(e)
    }
  }
})
