import { describe, expect, it } from 'vitest'
import { extractSectionBodyCandidates } from './bonfireAmbiguousSectionTestHelpers'

describe('sectionBodyExtraction', () => {
  it('extracts body from heading + paragraphs/list and stops at the next peer heading', () => {
    const html = `
      <nav><a>Navigation</a></nav>
      <h1>Druida</h1>
      <h3>Forma Lunar</h3>
      <p>Você aprende a canalizar magia da lua.</p>
      <ul><li>Você ganha Vantagem em Testes de Resistência.</li></ul>
      <h3>Outro Título</h3>
      <p>Não deve entrar na seção anterior.</p>
      <footer>Related Articles</footer>
    `

    const candidates = extractSectionBodyCandidates({
      html,
      pageTitle: 'Druida',
      pageH1: 'Druida',
      sourceUrl: 'https://example.invalid/druida',
      sourceFile: 'data/Classes/druida.html',
      rule: { name: 'Forma Lunar' },
    })
    const candidate = candidates.find((entry) => entry.heading === 'Forma Lunar')

    expect(candidate).toBeTruthy()
    expect(candidate?.text).toContain('Você aprende a canalizar magia da lua.')
    expect(candidate?.text).toContain('Você ganha Vantagem em Testes de Resistência.')
    expect(candidate?.text).not.toContain('Outro Título')
    expect(candidate?.text).not.toContain('Related Articles')
  })
})
