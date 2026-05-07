import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('noPdfFallbackInMainUi', () => {
  it('keeps PDF fallback out of the primary flow and only inside advanced/debug UI', () => {
    const html = renderToStaticMarkup(createElement(App))

    expect(html).toContain('Avançado / Debug')
    expect(html).not.toContain('>Converter PDF<')
    expect(html).toContain('Converter PDF (avançado)')
  })
})
