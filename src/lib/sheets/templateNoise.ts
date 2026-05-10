import { normalizeSheetCellValue } from './readWorkbook'

const exactNoiseValues = new Set([
  'raca',
  'race',
  'classe',
  'class',
  'antecedente',
  'background',
  'talento',
  'talentos',
  'feat',
  'feats',
  'caracteristica',
  'caracteristicas',
  'feature',
  'features',
  'subclasse',
  'subclass',
  'outros',
  'escolha',
  'selecionar',
  'placeholder',
  'nivel',
  'level',
])

const placeholderPhrases = new Set([
  'escolha sua raca',
  'escolha sua classe',
  'escolha seu antecedente',
])

export function stripFeatureLevelPrefix(value: string): string {
  const trimmed = String(value ?? '').trim()
  return trimmed
    .replace(/^(?:N[ií]vel|Nivel|Level)\s+\d+\s*[:\-–—]\s*/i, '')
    .trim()
}

export function isTemplateNoiseOrPlaceholder(value: string): boolean {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return true

  const normalized = normalizeSheetCellValue(trimmed).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return true
  if (placeholderPhrases.has(normalized)) return true
  if (exactNoiseValues.has(normalized)) return true
  if (/^(nivel|level)\s+\d+$/i.test(normalized)) return true

  return false
}

export function normalizeTemplateFeatureValue(value: string): string | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  if (isTemplateNoiseOrPlaceholder(trimmed)) return null

  const withoutLevelPrefix = stripFeatureLevelPrefix(trimmed)
  if (!withoutLevelPrefix || isTemplateNoiseOrPlaceholder(withoutLevelPrefix)) return null
  return withoutLevelPrefix
}

export function isTemplatePlaceholderBackgroundValue(value: string): boolean {
  const normalized = normalizeSheetCellValue(value).replace(/\s+/g, ' ').trim()
  return normalized === 'antecedente' || normalized === 'background' || normalized === 'escolha seu antecedente'
}
