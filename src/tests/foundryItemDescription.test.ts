import { describe, expect, it } from 'vitest'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('foundryItemDescription', () => {
  it('uses exact Bonfire text when available and never leaks the old generic preview text', async () => {
    const { actor } = await loadClerigoLevel5Foundry()

    const clerigo = actor.items.find((item) => item.name === 'Clérigo')
    const canalizar = actor.items.find((item) => item.name === 'Canalizar Divindade')
    const folken = actor.items.find((item) => item.name === 'Folken Limalumes')
    const espiao = actor.items.find((item) => item.name === 'Espião')
    const descriptionOf = (item: (typeof actor.items)[number] | undefined) => String(((item?.system as any)?.description as any)?.value ?? '')

    expect(descriptionOf(clerigo)).not.toContain('Classe extraida da ficha')
    expect(descriptionOf(canalizar)).toContain('Canalizar Divindade')
    expect(descriptionOf(folken)).toContain('Folken Limalumes')
    expect(descriptionOf(espiao)).toContain('Espião')
    expect(descriptionOf(canalizar)).not.toContain('Descricao Bonfire completa ainda nao foi verificada')
    expect(descriptionOf(canalizar)).not.toContain('Descricao Bonfire nao encontrada')
    expect(descriptionOf(canalizar)).toContain('Que a maré do Alto encontre passagem em mim sem me romper')
  })
})
