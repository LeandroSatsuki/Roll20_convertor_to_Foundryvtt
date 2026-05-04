import { describe, expect, it } from 'vitest'
import { parseAbilities } from '../lib/parser/parseAbilities'
import { parseSaves } from '../lib/parser/parseSaves'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('parseSaves', () => {
  it('infers saving throw proficiencies', () => {
    const { abilities } = parseAbilities(sampleHeyzelText)
    const { saves } = parseSaves(sampleHeyzelText, abilities, 3)
    expect(saves.str.proficient.value).toBe(true)
    expect(saves.con.proficient.value).toBe(true)
    expect(saves.wis.proficient.value).toBe(true)
    expect(saves.dex.proficient.value).toBe(false)
    expect(saves.int.proficient.value).toBe(false)
    expect(saves.cha.proficient.value).toBe(false)
  })
})
