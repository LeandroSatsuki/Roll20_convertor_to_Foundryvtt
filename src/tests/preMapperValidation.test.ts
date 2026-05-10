import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import type { NormalizedCharacter } from '../lib/normalize/normalizedCharacterTypes'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createClerigoLevel5WorkbookData } from './createClerigoLevel5Workbook'

describe('pre mapper validation', () => {
  it('blocks export when background is FOR', async () => {
    const character = await parseSample()
    character.identity.background.value = 'FOR'
    character.warnings.push({ code: 'BACKGROUND_INVALID_TEMPLATE_VALUE', severity: 'error', message: 'bad background', fieldPath: 'identity.background' })

    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((entry) => entry.code === 'BACKGROUND_INVALID_TEMPLATE_VALUE')).toBe(true)
  })

  it('blocks export when an ability score is signed', async () => {
    const character = await parseSample()
    character.abilities.dex.score.raw = 'K18: +2'
    character.warnings.push({ code: 'SHEET_ABILITY_SCORE_INVALID', severity: 'error', message: 'signed score', fieldPath: 'abilities.dex.score' })

    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((entry) => entry.code === 'SHEET_ABILITY_SCORE_INVALID')).toBe(true)
  })

  it('blocks export when passive perception is text', async () => {
    const character = await parseSample()
    ;(character.attributes.passivePerception as any).value = 'Nivel 1'
    character.warnings.push({ code: 'PASSIVE_PERCEPTION_INVALID', severity: 'error', message: 'text passive perception', fieldPath: 'attributes.passivePerception' })

    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((entry) => entry.code === 'PASSIVE_PERCEPTION_INVALID')).toBe(true)
  })

  it('blocks export when speed duplicates hp.max from the same cell', async () => {
    const character = await parseSample()
    character.attributes.speed.value = 33
    character.attributes.speed.raw = character.attributes.hp.max.raw
    character.warnings.push({ code: 'SHEET_SPEED_LOOKS_LIKE_HP_DUPLICATE', severity: 'error', message: 'speed duplicated from hp', fieldPath: 'attributes.speed' })

    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((entry) => entry.code === 'SHEET_SPEED_LOOKS_LIKE_HP_DUPLICATE')).toBe(true)
  })
})

async function parseSample(): Promise<NormalizedCharacter> {
  const workbook = await readWorkbook(createClerigoLevel5WorkbookData(), 'Pipkin.xlsx')
  return parseBonfireCharacterSheet(workbook).character
}
