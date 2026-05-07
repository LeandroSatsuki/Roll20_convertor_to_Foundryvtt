import { buildConversionBundle, type ConversionBundleOptions } from '../lib/pipeline/buildConversionBundle'
import type { NormalizedCharacter } from '../lib/normalize/normalizedCharacterTypes'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

type WorkbookOptions = Parameters<typeof createBonfireV21Workbook>[0]

export async function buildBonfireBundle(
  workbookOptions: WorkbookOptions = {},
  mutate?: (character: NormalizedCharacter) => void,
  options: ConversionBundleOptions = {},
) {
  const workbook = await readWorkbook(createBonfireV21Workbook(workbookOptions), 'bonfire-v21-test.xlsx')
  const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
  mutate?.(parsed.character)
  return { ...parsed, bundle: buildConversionBundle(parsed.character, parsed.debug, options) }
}
