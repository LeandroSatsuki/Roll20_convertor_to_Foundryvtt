import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('noFalseNamedRangeWarnings', () => {
  it('keeps accepted named-range fallbacks in debug/audit only', async () => {
    const { character, bundle } = await buildBonfireBundle()
    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')

    expect(character.warnings.some((warning) => warning.code === 'NAMED_RANGE_NOT_FOUND' && warning.fieldPath === 'identity.name')).toBe(true)
    expect(biography).not.toContain('Named range nao encontrado')
    expect(biography).toContain('Importacao concluida sem pendencias jogaveis.')
  })
})
