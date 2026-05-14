import { describe, expect, it } from 'vitest'
import { buildApiUrl, buildDynamicProxyTarget } from './devProxy'

describe('buildApiUrl', () => {
  it('uses the same-origin proxy prefix when API proxy is enabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'images/edits', null, true)).toBe(
      `/api-proxy/${encodeURIComponent('http://api.example.com/v1')}/images/edits`,
    )
  })

  it('keeps the v1 segment when the configured API URL does not include it', () => {
    expect(buildApiUrl('http://api.example.com', 'images/generations', null, true)).toBe(
      `/api-proxy/${encodeURIComponent('http://api.example.com')}/v1/images/generations`,
    )
  })

  it('uses a configured proxy prefix while preserving the selected API URL', () => {
    expect(
      buildApiUrl(
        'http://subkkai.com/v1',
        'responses',
        {
          enabled: true,
          prefix: '/openai-proxy',
          target: 'http://api.example.com/v1',
          changeOrigin: true,
          secure: false,
        },
        true,
      ),
    ).toBe(`/openai-proxy/${encodeURIComponent('http://subkkai.com/v1')}/responses`)
  })

  it('uses the configured API URL directly when API proxy is disabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'responses', null, false)).toBe(
      'http://api.example.com/v1/responses',
    )
  })
})

describe('buildDynamicProxyTarget', () => {
  it('decodes the selected API URL and appends the proxied endpoint path', () => {
    expect(
      buildDynamicProxyTarget(
        `/api-proxy/${encodeURIComponent('https://subkkai.com/v1')}/images/generations`,
      ),
    ).toBe('https://subkkai.com/v1/images/generations')
  })

  it('preserves query parameters when building the target URL', () => {
    expect(
      buildDynamicProxyTarget(
        `/openai-proxy/${encodeURIComponent('http://api.example.com/v1')}/responses?trace=1`,
        '/openai-proxy',
      ),
    ).toBe('http://api.example.com/v1/responses?trace=1')
  })
})
