import svgpath from 'svgpath'

export { queryNodes } from './query.ts'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function retry<T>(
  fn: () => Promise<T | null | undefined>,
  maxAttempts = 10,
  delayMs = 50,
  backoff: 'fixed' | 'linear' | 'exponential' = 'fixed'
): Promise<T | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fn()
    if (result) return result
    if (attempt < maxAttempts - 1) {
      const delay =
        backoff === 'linear'
          ? delayMs * (attempt + 1)
          : backoff === 'exponential'
            ? delayMs * Math.pow(2, attempt)
            : delayMs
      await sleep(delay)
    }
  }
  return null
}

// Font cache to avoid repeated loadFontAsync calls
const loadedFonts = new Set<string>()
const fontLoadPromises = new Map<string, Promise<void>>()

// Preload common font
const interPromise = figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
fontLoadPromises.set('Inter:Regular', interPromise)
interPromise.then(() => loadedFonts.add('Inter:Regular'))

export function loadFont(family: string, style: string): Promise<void> | void {
  const key = `${family}:${style}`
  if (loadedFonts.has(key)) return

  const pending = fontLoadPromises.get(key)
  if (pending) return pending

  const promise = figma.loadFontAsync({ family, style })
  fontLoadPromises.set(key, promise)
  promise.then(() => {
    loadedFonts.add(key)
    fontLoadPromises.delete(key)
  })
  return promise
}

export async function appendToParent(
  node: SceneNode,
  parentId?: string,
  insertIndex?: number
) {
  if (parentId) {
    const parent = await retry(
      () => figma.getNodeByIdAsync(parentId) as Promise<(FrameNode & ChildrenMixin) | null>,
      10,
      50
    )
    if (parent && 'appendChild' in parent) {
      if (insertIndex !== undefined && 'insertChild' in parent) {
        parent.insertChild(insertIndex, node)
      } else {
        parent.appendChild(node)
      }
      return
    }
    console.warn(`Parent ${parentId} not found after retries, appending to page`)
  }
  figma.currentPage.appendChild(node)
}

export function serializeNode(node: BaseNode): object {
  const base: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type
  }
  if (node.parent && node.parent.type !== 'PAGE') {
    base.parentId = node.parent.id
  }
  if ('x' in node) base.x = Math.round(node.x)
  if ('y' in node) base.y = Math.round(node.y)
  if ('width' in node) base.width = Math.round(node.width)
  if ('height' in node) base.height = Math.round(node.height)

  // Layout sizing for children in auto-layout
  if ('layoutSizingHorizontal' in node && node.layoutSizingHorizontal !== 'FIXED') {
    base.layoutSizingHorizontal = node.layoutSizingHorizontal
  }
  if ('layoutSizingVertical' in node && node.layoutSizingVertical !== 'FIXED') {
    base.layoutSizingVertical = node.layoutSizingVertical
  }

  if ('opacity' in node && node.opacity !== 1) base.opacity = node.opacity
  if ('visible' in node && !node.visible) base.visible = false
  if ('locked' in node && node.locked) base.locked = true

  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    base.fills = node.fills.map(serializePaint)
  }
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    base.strokes = node.strokes.map(serializePaint)
  }
  if ('strokeWeight' in node && typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {
    base.strokeWeight = node.strokeWeight
  }
  if ('strokeAlign' in node && node.strokeAlign !== 'CENTER') {
    base.strokeAlign = node.strokeAlign
  }
  if ('strokeTopWeight' in node) {
    const sw = node.strokeWeight as number
    if (node.strokeTopWeight !== sw) base.strokeTopWeight = node.strokeTopWeight
    if ((node as FrameNode).strokeBottomWeight !== sw)
      base.strokeBottomWeight = (node as FrameNode).strokeBottomWeight
    if ((node as FrameNode).strokeLeftWeight !== sw)
      base.strokeLeftWeight = (node as FrameNode).strokeLeftWeight
    if ((node as FrameNode).strokeRightWeight !== sw)
      base.strokeRightWeight = (node as FrameNode).strokeRightWeight
  }
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    base.cornerRadius = node.cornerRadius
  }
  if (
    'cornerSmoothing' in node &&
    typeof node.cornerSmoothing === 'number' &&
    node.cornerSmoothing > 0
  ) {
    base.cornerSmoothing = node.cornerSmoothing
  }
  if ('topLeftRadius' in node) {
    const cr = node.cornerRadius as number
    const frame = node as FrameNode
    if (
      frame.topLeftRadius !== cr ||
      frame.topRightRadius !== cr ||
      frame.bottomLeftRadius !== cr ||
      frame.bottomRightRadius !== cr
    ) {
      base.topLeftRadius = frame.topLeftRadius
      base.topRightRadius = frame.topRightRadius
      base.bottomLeftRadius = frame.bottomLeftRadius
      base.bottomRightRadius = frame.bottomRightRadius
    }
  }
  if ('blendMode' in node && node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') {
    base.blendMode = node.blendMode
  }
  if ('rotation' in node && node.rotation !== 0) {
    base.rotation = Math.round(node.rotation * 100) / 100
  }
  if ('clipsContent' in node && node.clipsContent) {
    base.clipsContent = true
  }
  if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
    const visibleEffects = node.effects.filter((e: Effect) => e.visible !== false)
    if (visibleEffects.length > 0) {
      base.effects = visibleEffects.map((e: Effect) => {
        const effect: Record<string, unknown> = { type: e.type }
        if ('radius' in e) effect.radius = e.radius
        if ('color' in e && e.color) {
          effect.color = rgbToHex(e.color)
          if (e.color.a !== 1) effect.opacity = Math.round(e.color.a * 100) / 100
        }
        if ('offset' in e && e.offset) {
          effect.offset = { x: e.offset.x, y: e.offset.y }
        }
        if ('spread' in e) effect.spread = e.spread
        return effect
      })
    }
  }

  if ('componentPropertyDefinitions' in node) {
    try {
      base.componentPropertyDefinitions = node.componentPropertyDefinitions
    } catch {
      // Variant components throw when accessing componentPropertyDefinitions
    }
  }
  if ('componentProperties' in node) {
    base.componentProperties = node.componentProperties
  }

  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    base.layoutMode = node.layoutMode
    if ('itemSpacing' in node) base.itemSpacing = node.itemSpacing
    if ('layoutWrap' in node && node.layoutWrap === 'WRAP') {
      base.layoutWrap = 'WRAP'
    }
    if ('primaryAxisSizingMode' in node) base.primaryAxisSizingMode = node.primaryAxisSizingMode
    if ('counterAxisSizingMode' in node) base.counterAxisSizingMode = node.counterAxisSizingMode
    if ('primaryAxisAlignItems' in node && node.primaryAxisAlignItems !== 'MIN') {
      base.primaryAxisAlignItems = node.primaryAxisAlignItems
    }
    if ('counterAxisAlignItems' in node && node.counterAxisAlignItems !== 'MIN') {
      base.counterAxisAlignItems = node.counterAxisAlignItems
    }
    if (
      'paddingLeft' in node &&
      (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom)
    ) {
      base.padding = {
        left: node.paddingLeft,
        right: node.paddingRight,
        top: node.paddingTop,
        bottom: node.paddingBottom
      }
    }
    if (node.layoutMode === 'GRID') {
      const gridNode = node as FrameNode
      if (gridNode.gridColumnGap !== undefined) base.gridColumnGap = gridNode.gridColumnGap
      if (gridNode.gridRowGap !== undefined) base.gridRowGap = gridNode.gridRowGap
      if (gridNode.gridColumnCount !== undefined) base.gridColumnCount = gridNode.gridColumnCount
      if (gridNode.gridRowCount !== undefined) base.gridRowCount = gridNode.gridRowCount
      if (gridNode.gridColumnSizes?.length > 0) base.gridColumnSizes = gridNode.gridColumnSizes
      if (gridNode.gridRowSizes?.length > 0) base.gridRowSizes = gridNode.gridRowSizes
    }
  }

  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') {
    base.layoutPositioning = 'ABSOLUTE'
  }
  if ('layoutGrow' in node && node.layoutGrow > 0) {
    base.layoutGrow = node.layoutGrow
  }
  if ('layoutAlign' in node && node.layoutAlign === 'STRETCH') {
    base.layoutAlign = 'STRETCH'
  }
  if ('minWidth' in node && node.minWidth !== null) base.minWidth = node.minWidth
  if ('maxWidth' in node && node.maxWidth !== null) base.maxWidth = node.maxWidth
  if ('minHeight' in node && node.minHeight !== null) base.minHeight = node.minHeight
  if ('maxHeight' in node && node.maxHeight !== null) base.maxHeight = node.maxHeight

  if (node.type === 'TEXT') {
    const textNode = node as TextNode
    base.characters = textNode.characters
    if (typeof textNode.fontSize === 'number') base.fontSize = textNode.fontSize
    if (typeof textNode.fontName === 'object') {
      base.fontFamily = textNode.fontName.family
      base.fontStyle = textNode.fontName.style
    }
  }

  if ('children' in node) {
    base.childCount = (node as ChildrenMixin).children.length
  }

  return base
}

export function serializePaint(paint: Paint): object {
  if (paint.type === 'SOLID') {
    const result: Record<string, unknown> = {
      type: 'SOLID',
      color: rgbToHex(paint.color)
    }
    if (paint.opacity !== undefined && paint.opacity !== 1) result.opacity = paint.opacity
    return result
  }
  if (paint.type === 'IMAGE') {
    return { type: 'IMAGE', imageHash: paint.imageHash, scaleMode: paint.scaleMode }
  }
  if (
    paint.type === 'GRADIENT_LINEAR' ||
    paint.type === 'GRADIENT_RADIAL' ||
    paint.type === 'GRADIENT_ANGULAR' ||
    paint.type === 'GRADIENT_DIAMOND'
  ) {
    return {
      type: paint.type,
      stops: paint.gradientStops.map((s) => ({ color: rgbToHex(s.color), position: s.position }))
    }
  }
  return { type: paint.type }
}

export function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, '0')
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, '0')
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

export function expandHex(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    return clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
  }
  if (clean.length === 4) {
    return clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]
  }
  return clean
}

export function hexToRgb(hex: string): RGB {
  const clean = expandHex(hex)
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255
  }
}

export function parseColorString(color: string): { hex?: string; variable?: string } {
  const varMatch = color.match(/^(?:var:|[$])(.+)$/)
  if (varMatch) {
    return { variable: varMatch[1] }
  }
  return { hex: color }
}

export function getHexColor(color: string): string {
  const parsed = parseColorString(color)
  return parsed.hex || '#000000'
}

export async function createSolidPaint(color: string): Promise<SolidPaint> {
  const parsed = parseColorString(color)

  if (parsed.hex) {
    return { type: 'SOLID', color: hexToRgb(parsed.hex) }
  }

  const variables = await figma.variables.getLocalVariablesAsync('COLOR')
  const variable = variables.find((v) => v.name === parsed.variable)

  if (!variable) {
    console.warn(`Variable "${parsed.variable}" not found, using black`)
    return { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }
  }

  const paint: SolidPaint = {
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }

  return figma.variables.setBoundVariableForPaint(paint, 'color', variable)
}

export function hexToRgba(hex: string): RGBA {
  const clean = expandHex(hex)
  const hasAlpha = clean.length === 8
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
    a: hasAlpha ? parseInt(clean.slice(6, 8), 16) / 255 : 1
  }
}

export function serializeVariable(v: Variable): object {
  return {
    id: v.id,
    name: v.name,
    type: v.resolvedType,
    collectionId: v.variableCollectionId,
    description: v.description || undefined,
    valuesByMode: Object.fromEntries(
      Object.entries(v.valuesByMode).map(([modeId, value]) => [
        modeId,
        serializeVariableValue(value, v.resolvedType)
      ])
    )
  }
}

export function serializeCollection(c: VariableCollection): object {
  return {
    id: c.id,
    name: c.name,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableIds: c.variableIds
  }
}

export function serializeVariableValue(value: VariableValue, type: string): unknown {
  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    return rgbToHex(value as RGB)
  }
  if (typeof value === 'object' && 'type' in value && (value as any).type === 'VARIABLE_ALIAS') {
    return { alias: (value as VariableAlias).id }
  }
  return value
}

export function parseVariableValue(value: string, type: string): VariableValue {
  switch (type) {
    case 'COLOR':
      return hexToRgb(value)
    case 'FLOAT':
      return parseFloat(value)
    case 'BOOLEAN':
      return value === 'true'
    case 'STRING':
    default:
      return value
  }
}

export function svgPathToString(sp: ReturnType<typeof svgpath>): string {
  return sp.segments.map((seg: (string | number)[]) => seg.join(' ')).join(' ')
}
