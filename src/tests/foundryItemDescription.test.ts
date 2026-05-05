import { describe, expect, it } from 'vitest'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

describe('foundryItemDescription', () => {
  it('uses Rule Store descriptions instead of the old generic placeholders', async () => {
    const { actor } = await loadPipkinFoundry()

    const clerigo = actor.items.find((item) => item.name === 'Clérigo')
    const canalizar = actor.items.find((item) => item.name === 'Canalizar Divindade')
    const folken = actor.items.find((item) => item.name === 'Folken Limalumes')
    const espiao = actor.items.find((item) => item.name === 'Espião')
    const descriptionOf = (item: (typeof actor.items)[number] | undefined) => String(((item?.system as any)?.description as any)?.value ?? '')

    expect(descriptionOf(clerigo)).not.toContain('Classe extraida da ficha')
    expect(descriptionOf(canalizar)).toContain('Canalizar Divindade')
    expect(descriptionOf(folken)).toContain('Folken Limalumes')
    expect(descriptionOf(espiao)).toContain('Espião')
    expect(descriptionOf(canalizar)).toContain('URL:')
  })
})
