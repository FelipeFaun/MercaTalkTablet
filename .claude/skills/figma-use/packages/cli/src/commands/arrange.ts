import { defineCommand } from 'citty'

import { sendCommand, printResult, handleError } from '../client.ts'

export default defineCommand({
  meta: {
    name: 'arrange',
    description: `Arrange nodes on the canvas using layout algorithms

Examples:
  figma-use arrange                                # Arrange all top-level nodes in a grid
  figma-use arrange "1:2 1:3 1:4" --mode row      # Arrange specific nodes in a row
  figma-use arrange --mode column --gap 80         # Vertical stack with 80px gap
  figma-use arrange --mode squarify --gap 60       # Smart packing via d3 treemap
  figma-use arrange --mode binary --width 5000     # Balanced binary split`
  },
  args: {
    ids: {
      type: 'positional',
      description: 'Node IDs (space separated, or all top-level children if omitted)',
      required: false
    },
    mode: {
      type: 'string',
      description: 'Layout mode: grid, row, column, squarify, binary (default: grid)'
    },
    gap: { type: 'string', description: 'Spacing between nodes (default: 40)' },
    cols: { type: 'string', description: 'Column count (grid mode, default: auto)' },
    width: { type: 'string', description: 'Bounding width (squarify/binary, default: auto)' },
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    try {
      const ids = args.ids ? (args.ids as string).split(/[\s,]+/).filter(Boolean) : undefined
      const result = await sendCommand('arrange', {
        ids,
        mode: args.mode ?? 'grid',
        gap: args.gap ? Number(args.gap) : undefined,
        cols: args.cols ? Number(args.cols) : undefined,
        width: args.width ? Number(args.width) : undefined
      })
      printResult(result, args.json)
    } catch (e) {
      handleError(e)
    }
  }
})
