import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('auditReportRuleResolution', () => {
  it('includes rule-resolution metrics and warnings', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const actor = mapNormalizedToFoundryActor(character)
    const report = buildExportAuditReport(actor, character)

    expect(report.summary.resolvedHighCount).toBeGreaterThan(0)
    expect(report.summary.unresolvedCount).toBeGreaterThanOrEqual(0)
    const unknownActor = { ...actor, items: [...actor.items, { ...actor.items[0], _id: 'abcdefghABCDEFGH', name: 'Coisa Misteriosa', system: { ...actor.items[0].system, identifier: 'coisa-misteriosa' }, flags: { 'roll20-to-foundry': { ruleResolution: { kind: 'unknown', confidence: 'unknown', candidates: [] } } } }] }
    const unknownReport = buildExportAuditReport(unknownActor, character)
    expect(unknownReport.validations.some((validation) => validation.code === 'RULE_NOT_FOUND')).toBe(true)
  })
})
