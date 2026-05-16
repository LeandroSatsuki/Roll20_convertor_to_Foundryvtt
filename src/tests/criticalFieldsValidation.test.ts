import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('critical sheet field validation', () => {
  it('blocks export when the character name is absent', async () => {
    const character = await parseRows([['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'], ['RACA', 'Folken'], ['ANTECEDENTE', 'Espiao'], ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'], ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'], ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'], ['PERICIAS'], ['CARACTERISTICAS'], ['MOCHILA'], ['PONTOS DE VIDA'], ['SABEDORIA PASSIVA', '14']])
    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((validation) => validation.code === 'SHEET_CHARACTER_NAME_MISSING')).toBe(true)
  })

  it('blocks export when an ability is absent', { timeout: 15000 }, async () => {
    const character = await parseRows([['PERSONAGEM', 'Pipkin'], ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'], ['RACA', 'Folken'], ['ANTECEDENTE', 'Espiao'], ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'], ['SABEDORIA', '18', 'CARISMA', '14'], ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'], ['PERICIAS'], ['CARACTERISTICAS'], ['MOCHILA'], ['PONTOS DE VIDA'], ['SABEDORIA PASSIVA', '14']])
    const audit = buildExportAuditReport(mapNormalizedToFoundryActor(character), character)
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((validation) => validation.code === 'SHEET_ABILITY_SCORE_MISSING' && validation.path === 'abilities.int.score')).toBe(true)
  })

  it('does not export flat AC when AC is absent', { timeout: 15000 }, async () => {
    const character = await parseRows([['PERSONAGEM', 'Pipkin'], ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'], ['RACA', 'Folken'], ['ANTECEDENTE', 'Espiao'], ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'], ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'], ['PV MAXIMO', '33', 'VELOCIDADE', '25'], ['PERICIAS'], ['CARACTERISTICAS'], ['MOCHILA'], ['PONTOS DE VIDA'], ['SABEDORIA PASSIVA', '14']])
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)
    expect(actor.system.attributes.ac.calc).not.toBe('flat')
    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.validations.some((validation) => validation.code === 'SHEET_AC_MISSING')).toBe(true)
  })
})

async function parseRows(rows: string[][]) {
  const workbook = await readWorkbook(createWorkbookData([{ name: 'Ficha', rows }]), 'critical.xlsx')
  return parseBonfireCharacterSheet(workbook).character
}
