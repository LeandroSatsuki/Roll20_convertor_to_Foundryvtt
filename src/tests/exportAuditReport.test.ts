import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { exportAuditReport } from '../lib/export/exportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('exportAuditReport', () => {
  it('exports parseable audit report JSON', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const actor = mapNormalizedToFoundryActor(character)
    const report = buildExportAuditReport(actor, character)
    const parsed = JSON.parse(exportAuditReport(report))
    expect(parsed.summary).toBeTruthy()
    expect(Array.isArray(parsed.validations)).toBe(true)
    expect(parsed.importReadiness).toBeTruthy()
  })
})
