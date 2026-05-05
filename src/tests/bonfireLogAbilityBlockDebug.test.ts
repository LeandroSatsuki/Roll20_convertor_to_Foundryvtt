import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log ability block debug', () => {
  it('lists candidate cells and a selected cell for every ability', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const entry = result.debug.abilityBlockCandidates.find((candidate) => candidate.ability === ability)
      expect(entry).toBeDefined()
      expect(entry?.candidateCells.length).toBeGreaterThan(0)
      expect(entry?.selectedCell).toBeTruthy()
    }
  })
})
