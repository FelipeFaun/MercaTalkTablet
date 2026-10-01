/**
 * Serialize/deserialize Figma nodes to/from text format for unified diff.
 *
 * Format:
 *   type: RECTANGLE
 *   size: 100 50
 *   pos: 200 150
 *   fill: #FF0000
 *   opacity: 0.8
 */

interface Effect {
  type: string
  radius?: number
  color?: string
  opacity?: number
  offset?: { x: number; y: number }
  spread?: number
}

export interface NodeProps {
  type: string
  name?: string
  size?: [number, number]
  pos?: [number, number]
  fill?: string
  stroke?: string
  strokeWeight?: number
  opacity?: number
  radius?: number
  radii?: [number, number, number, number]
  cornerSmoothing?: number
  blendMode?: string
  rotation?: number
  clipsContent?: boolean
  effects?: Effect[]
  vectorPaths?: string[]
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  text?: string
  visible?: boolean
  locked?: boolean
}

export function serializeNode(node: Record<string, unknown>): string {
  const lines: string[] = []

  lines.push(`type: ${node.type}`)

  if (node.width !== undefined && node.height !== undefined) {
    lines.push(`size: ${node.width} ${node.height}`)
  }

  if (node.x !== undefined && node.y !== undefined) {
    lines.push(`pos: ${node.x} ${node.y}`)
  }

  // Fill color (first solid fill)
  const fills = node.fills as Array<{ type: string; color?: string }> | undefined
  const firstFill = fills?.[0]
  if (firstFill?.type === 'SOLID' && firstFill.color) {
    lines.push(`fill: ${firstFill.color}`)
  }

  // Stroke color (first solid stroke)
  const strokes = node.strokes as Array<{ type: string; color?: string }> | undefined
  const firstStroke = strokes?.[0]
  if (firstStroke?.type === 'SOLID' && firstStroke.color) {
    lines.push(`stroke: ${firstStroke.color}`)
  }

  if (node.strokeWeight !== undefined && node.strokeWeight !== 0) {
    lines.push(`strokeWeight: ${node.strokeWeight}`)
  }

  if (node.opacity !== undefined && node.opacity !== 1) {
    lines.push(`opacity: ${roundTo(node.opacity as number, 2)}`)
  }

  // Corner radius - check for individual radii first
  const hasIndividualRadii =
    node.topLeftRadius !== undefined ||
    node.topRightRadius !== undefined ||
    node.bottomLeftRadius !== undefined ||
    node.bottomRightRadius !== undefined

  if (hasIndividualRadii) {
    const tl = (node.topLeftRadius as number) ?? 0
    const tr = (node.topRightRadius as number) ?? 0
    const bl = (node.bottomLeftRadius as number) ?? 0
    const br = (node.bottomRightRadius as number) ?? 0
    if (tl !== 0 || tr !== 0 || bl !== 0 || br !== 0) {
      // Check if all radii are the same
      if (tl === tr && tr === bl && bl === br) {
        lines.push(`radius: ${tl}`)
      } else {
        lines.push(`radii: ${tl} ${tr} ${br} ${bl}`)
      }
    }
  } else if (node.cornerRadius !== undefined && node.cornerRadius !== 0) {
    lines.push(`radius: ${node.cornerRadius}`)
  }

  // Corner smoothing (iOS-style squircle)
  if (node.cornerSmoothing !== undefined && node.cornerSmoothing !== 0) {
    lines.push(`cornerSmoothing: ${roundTo(node.cornerSmoothing as number, 2)}`)
  }

  // Blend mode
  if (
    node.blendMode !== undefined &&
    node.blendMode !== 'PASS_THROUGH' &&
    node.blendMode !== 'NORMAL'
  ) {
    lines.push(`blendMode: ${node.blendMode}`)
  }

  // Rotation
  if (node.rotation !== undefined && node.rotation !== 0) {
    lines.push(`rotation: ${roundTo(node.rotation as number, 2)}`)
  }

  // Clips content
  if (node.clipsContent === true) {
    lines.push(`clipsContent: true`)
  }

  // Effects (shadows, blurs)
  const effects = node.effects as Effect[] | undefined
  if (effects && effects.length > 0) {
    for (const effect of effects) {
      const parts = [effect.type]
      if (effect.radius !== undefined) parts.push(`r=${effect.radius}`)
      if (effect.color) parts.push(`c=${effect.color}`)
      if (effect.opacity !== undefined && effect.opacity !== 1) parts.push(`o=${effect.opacity}`)
      if (effect.offset) parts.push(`x=${effect.offset.x} y=${effect.offset.y}`)
      if (effect.spread !== undefined) parts.push(`s=${effect.spread}`)
      lines.push(`effect: ${parts.join(' ')}`)
    }
  }

  // Vector paths (SVG)
  const vectorPaths = node.vectorPaths as Array<{ data: string }> | undefined
  if (vectorPaths && vectorPaths.length > 0) {
    for (const path of vectorPaths) {
      if (path.data) {
        lines.push(`path: ${path.data}`)
      }
    }
  }

  // Text-specific
  if (node.type === 'TEXT') {
    if (node.characters !== undefined) {
      lines.push(`text: ${JSON.stringify(node.characters)}`)
    }
    if (node.fontSize !== undefined) {
      lines.push(`fontSize: ${node.fontSize}`)
    }
    if (node.fontName !== undefined) {
      const fontName = node.fontName as { family?: string; style?: string }
      if (fontName.family) {
        lines.push(`fontFamily: ${fontName.family}`)
      }
    }
  }

  if (node.visible === false) {
    lines.push(`visible: false`)
  }

  if (node.locked === true) {
    lines.push(`locked: true`)
  }

  return lines.join('\n')
}

export function deserializeNode(text: string): NodeProps {
  const props: NodeProps = { type: 'UNKNOWN' }
  const effects: Effect[] = []
  const paths: string[] = []

  for (const line of text.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    switch (key) {
      case 'type':
        props.type = value
        break
      case 'name':
        props.name = value
        break
      case 'size': {
        const parts = value.split(' ').map(Number)
        props.size = [parts[0] ?? 0, parts[1] ?? 0]
        break
      }
      case 'pos': {
        const parts = value.split(' ').map(Number)
        props.pos = [parts[0] ?? 0, parts[1] ?? 0]
        break
      }
      case 'fill':
        props.fill = value
        break
      case 'stroke':
        props.stroke = value
        break
      case 'strokeWeight':
        props.strokeWeight = Number(value)
        break
      case 'opacity':
        props.opacity = Number(value)
        break
      case 'radius':
        props.radius = Number(value)
        break
      case 'radii': {
        const parts = value.split(' ').map(Number)
        props.radii = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0]
        break
      }
      case 'cornerSmoothing':
        props.cornerSmoothing = Number(value)
        break
      case 'blendMode':
        props.blendMode = value
        break
      case 'rotation':
        props.rotation = Number(value)
        break
      case 'clipsContent':
        props.clipsContent = value === 'true'
        break
      case 'effect': {
        const effect: Effect = { type: '' }
        const parts = value.split(' ')
        effect.type = parts[0] ?? ''
        for (const part of parts.slice(1)) {
          if (part.startsWith('r=')) effect.radius = Number(part.slice(2))
          else if (part.startsWith('c=')) effect.color = part.slice(2)
          else if (part.startsWith('o=')) effect.opacity = Number(part.slice(2))
          else if (part.startsWith('x='))
            effect.offset = { x: Number(part.slice(2)), y: effect.offset?.y ?? 0 }
          else if (part.startsWith('y='))
            effect.offset = { x: effect.offset?.x ?? 0, y: Number(part.slice(2)) }
          else if (part.startsWith('s=')) effect.spread = Number(part.slice(2))
        }
        effects.push(effect)
        break
      }
      case 'path':
        paths.push(value)
        break
      case 'fontSize':
        props.fontSize = Number(value)
        break
      case 'fontFamily':
        props.fontFamily = value
        break
      case 'fontWeight':
        props.fontWeight = Number(value)
        break
      case 'text':
        props.text = JSON.parse(value)
        break
      case 'visible':
        props.visible = value === 'true'
        break
      case 'locked':
        props.locked = value === 'true'
        break
    }
  }

  if (effects.length > 0) props.effects = effects
  if (paths.length > 0) props.vectorPaths = paths

  return props
}

/**
 * Compute property changes between old and new props.
 * Returns only the fields that differ.
 */
export function diffProps(oldProps: NodeProps, newProps: NodeProps): Partial<NodeProps> {
  const changes: Partial<NodeProps> = {}

  for (const key of Object.keys(newProps) as Array<keyof NodeProps>) {
    const oldVal = oldProps[key]
    const newVal = newProps[key]

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        ;(changes as Record<string, unknown>)[key] = newVal
      }
    } else if (typeof oldVal === 'object' && typeof newVal === 'object') {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        ;(changes as Record<string, unknown>)[key] = newVal
      }
    } else if (oldVal !== newVal) {
      ;(changes as Record<string, unknown>)[key] = newVal
    }
  }

  return changes
}

function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}
