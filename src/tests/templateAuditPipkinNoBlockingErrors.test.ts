import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('templateAuditPipkinNoBlockingErrors', () => {
  it('exports Pipkin without blocking template errors', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const actor = mapNormalizedToFoundryActor(character)
    const audit = buildExportAuditReport(actor, character)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(audit.actorName).toContain('Pipkin')
    expect(Object.values(audit.auditDebug.abilitiesBeforeActorBuild ?? {})).not.toContain(null)
    expect(Object.values(audit.auditDebug.actorInputSnapshot?.abilities ?? {})).not.toContain(null)
    expect(audit.validations.some((entry) => entry.code === 'TEMPLATE_FIELD_MISSING' && entry.path?.includes('attributes.speed'))).toBe(false)
    expect(audit.validations.some((entry) => ['ABILITY_SCORE_MISSING_MODIFIER_ONLY', 'SHEET_ABILITY_SCORE_INVALID', 'SHEET_ABILITY_SCORE_MISSING', 'FOUNDRY_SKILL_MISSING'].includes(entry.code))).toBe(false)
  })
})
