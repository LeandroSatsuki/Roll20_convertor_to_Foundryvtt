import { readFileSync } from 'node:fs'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

export async function loadPipkinFoundry() {
  const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
  const parsed = parseBonfireCharacterSheet(workbook)
  const bundle = buildConversionBundle(parsed.character, parsed.debug)
  return { workbook, ...parsed, normalized: bundle.normalized, actor: bundle.actor, audit: bundle.audit, debug: bundle.debug, pipelineIds: bundle.pipelineIds }
}
