import { describe, expect, it } from 'vitest'
import { parseAbilities } from '../lib/parser/parseAbilities'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('parseAbilities', () => {
  it('extracts Heyzel ability scores', () => {
    const { abilities } = parseAbilities(sampleHeyzelText)
    expect(abilities.str.score.value).toBe(18)
    expect(abilities.dex.score.value).toBe(10)
    expect(abilities.con.score.value).toBe(16)
    expect(abilities.int.score.value).toBe(10)
    expect(abilities.wis.score.value).toBe(14)
    expect(abilities.cha.score.value).toBe(8)
  })
})
