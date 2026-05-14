import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { buildDynamicProxyTarget, normalizeDevProxyConfig } from './src/lib/devProxy'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function loadDevProxyConfig() {
  try {
    return normalizeDevProxyConfig(
      JSON.parse(readFileSync('./dev-proxy.config.json', 'utf-8')) as unknown,
    )
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return null
    throw error
  }
}

function proxyRequest(req: IncomingMessage, res: ServerResponse, target: string, secure: boolean, changeOrigin: boolean) {
  const targetUrl = new URL(target)
  const request = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest
  const headers = changeOrigin
    ? { ...req.headers, host: targetUrl.host }
    : req.headers

  const proxyReq = request(
    targetUrl,
    {
      method: req.method,
      headers,
      rejectUnauthorized: secure,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    },
  )

  proxyReq.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' })
    }
    res.end(JSON.stringify({ error: `API proxy error: ${error.message}` }))
  })

  req.pipe(proxyReq)
}

export default defineConfig(({ command }) => {
  const devProxyConfig = command === 'serve' ? loadDevProxyConfig() : null

  return {
    plugins: [
      react(),
      {
        name: 'dynamic-api-proxy',
        configureServer(server) {
          if (!devProxyConfig?.enabled) return

          server.middlewares.use((req, res, next) => {
            const target = buildDynamicProxyTarget(req.url ?? '', devProxyConfig.prefix)
            if (!target) {
              next()
              return
            }

            proxyRequest(req, res, target, devProxyConfig.secure, devProxyConfig.changeOrigin)
          })
        },
      },
    ],
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __DEV_PROXY_CONFIG__: JSON.stringify(devProxyConfig),
    },
    server: {
      host: true,
    },
  }
})
