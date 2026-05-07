import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('normalizedJsonAdvancedOnly', () => {
  it('marks normalized JSON as debug content and keeps it in the advanced/debug area', () => {
    const html = renderToStaticMarkup(createElement(App))

    expect(html).toContain('Avançado / Debug')
    expect(html).toContain('JSON normalizado (debug)')
    expect(html).toContain('Importar JSON normalizado')
    expect(html).not.toContain('Dados normalizados')
  })
})
