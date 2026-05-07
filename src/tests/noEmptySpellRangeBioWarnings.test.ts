import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('noEmptySpellRangeBioWarnings', () => {
  it('does not surface empty higher-level spell ranges in the biography', async () => {
    const { character, bundle } = await buildBonfireBundle({ includeMagias: true })
    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')

    expect(character.warnings.some((warning) => warning.code === 'SPELL_RANGE_EMPTY' && warning.fieldPath === 'spells.levels.spell4')).toBe(true)
    expect(biography).not.toContain('Nenhuma magia encontrada para spell4')
    expect(biography).not.toContain('Nenhuma magia encontrada para spell5')
  })
})
