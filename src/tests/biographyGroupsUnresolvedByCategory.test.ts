import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { unresolvedFeature } from './unresolvedBonfireTestUtils'

describe('Bonfire pending biography notes', () => {
  it('groups unresolved rules by player-facing category', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.features.push(unresolvedFeature('Traço Racial Desconhecido', 'race', 'raceFeature', 'R31'))
      character.features.push(unresolvedFeature('Recurso de Classe Desconhecido', 'class', 'classFeature', 'R32'))
      character.features.push(unresolvedFeature('Talento Desconhecido', 'feat', 'feat', 'Z31'))
    })

    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')

    expect(biography).toContain('Características para corrigir')
    expect(biography).toContain('<h4>Raça</h4>')
    expect(biography).toContain('Traço Racial Desconhecido (Não Encontrado, CORRIGIR!)')
    expect(biography).toContain('<h4>Classe</h4>')
    expect(biography).toContain('Recurso de Classe Desconhecido (Não Encontrado, CORRIGIR!)')
    expect(biography).toContain('<h4>Talentos</h4>')
    expect(biography).toContain('Talento Desconhecido (Não Encontrado, CORRIGIR!)')
    expect(biography).not.toContain('RULE_NOT_FOUND')
    expect(biography).not.toContain('FOUNDRY_LIBRARY_')
  })
})
