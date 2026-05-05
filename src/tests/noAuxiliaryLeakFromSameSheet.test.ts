import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('no auxiliary leak from same sheet', () => {
  it('does not import auxiliary list values as features or equipment', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const importedNames = [...character.features.map((feature) => feature.name.value), ...(character.equipment ?? []).map((item) => item.name.value)]

    for (const noise of ['Artífice', 'Associated Skills', 'bludgeoning', 'piercing', 'slashing']) {
      expect(importedNames).not.toContain(noise)
    }
  })
})
