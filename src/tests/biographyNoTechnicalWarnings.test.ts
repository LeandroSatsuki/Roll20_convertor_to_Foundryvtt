import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('biographyNoTechnicalWarnings', () => {
  it('keeps technical parser and hydration warnings out of the final biography', async () => {
    const { bundle } = await buildBonfireBundle({ includeMagias: true })
    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')

    expect(biography).not.toContain('Named range nao encontrado')
    expect(biography).not.toContain('Nenhuma magia encontrada para spell4')
    expect(biography).not.toContain('Roll20 PDF Conversion Notes')
    expect(biography).not.toContain('sourceCodeMarker')
    expect(biography).not.toContain('FOUNDRY_LIBRARY_')
  })
})
