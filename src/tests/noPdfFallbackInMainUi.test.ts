import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('noPdfFallbackInMainUi', () => {
  it('keeps legacy PDF import out of the primary flow and away from fallback wording', () => {
    const html = renderToStaticMarkup(createElement(App))

    expect(html).toContain('Avançado / Debug')
    expect(html).not.toContain('PDF fallback')
    expect(html).toContain('Converter PDF legado (avançado)')
  })
})
