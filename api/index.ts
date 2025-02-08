import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const config = { runtime: 'edge' }
const app = new Hono().basePath('/api')

app.use('/*', cors())

app.all('/*', async (c) => {
  const { ALLOWED_URLS } = env<{ ALLOWED_URLS?: string }>(c as any)
  const targetUrlStr = c.req.query('url')

  if (!targetUrlStr) {
    return c.json({
      error: 'A `url` query parameter is required for proxy url'
    }, 400)
  }

  if (ALLOWED_URLS) {
    const allowedUrls = ALLOWED_URLS.split(',').map(u => u.trim())
    const isAllowed = allowedUrls.some(allowedUrl => targetUrlStr.startsWith(allowedUrl))
    
    if (!isAllowed) {
      return c.json({
        error: 'The given `url` query parameter is not allowed'
      }, 403)
    }
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(targetUrlStr)
  } catch (e) {
    return c.json({
      error: 'Invalid URL provided in query parameter'
    }, 400)
  }

  const requestHeaders = new Headers(c.req.header())
  requestHeaders.delete('origin')

  let requestBody: any = null
  if (c.req.method === "POST" || c.req.method === "PUT" || c.req.method === "PATCH") {
    requestBody = await c.req.json().catch(() => null)
  }

  const proxyRequest = new Request(targetUrl.toString(), {
    method: c.req.method,
    headers: requestHeaders,
    body: requestBody ? JSON.stringify(requestBody) : null,
    cache: 'no-cache',
    mode: 'cors',
  })

  let response: Response
  try {
    response = await fetch(proxyRequest)
  } catch (err: any) {
    console.error(err)
    return c.json({
      error: `Failed to proxy request: ${err.toString()}`
    }, 502)
  }

  const responseHeaders = new Headers(response.headers)
  const restrictedHeaders = ['access-control-', 'content-encoding']

  restrictedHeaders.forEach(header => {
    responseHeaders.forEach((_, key) => {
      if (key.toLowerCase().startsWith(header)) {
        responseHeaders.delete(key)
      }
    })
  })

  responseHeaders.set('X-Forwarded-Host', targetUrl.host)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
})

export default handle(app)