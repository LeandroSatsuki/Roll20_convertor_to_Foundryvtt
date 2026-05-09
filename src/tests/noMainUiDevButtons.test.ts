import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('noMainUiDevButtons', () => {
  it('keeps debug-only actions inside the advanced area instead of the primary UI', () => {
    const html = renderToStaticMarkup(createElement(App))

    expect(html).toContain('Avançado / Dev')
    expect(html).toContain('JSON normalizado (debug)')
    expect(html).toContain('Texto PDF (debug)')
    expect(html).not.toContain('Rodar diagnóstico Pipkin')
    expect(html).not.toContain('Roll20 PDF Conversion Notes')
  })
})
