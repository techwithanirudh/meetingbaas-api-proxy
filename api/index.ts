import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const config = { runtime: 'edge' }
const app = new Hono().basePath('/api')

app.use('/*', cors())

app.all('/*', async (c) => {
  // ALLOWED_URLS should be a comma-separated list (e.g., "https://api.example.com,https://another.com")
  const { ALLOWED_URLS } = env<{ ALLOWED_URLS?: string }>(c as any)

  const targetUrlStr = c.req.query('url')
  if (!targetUrlStr) {
    return c.json(
      { error: 'A `url` query parameter is required for proxy url' },
      400
    )
  }

  if (ALLOWED_URLS) {
    const allowedUrls = ALLOWED_URLS.split(',').map(u => u.trim())
    const isAllowed = allowedUrls.some(allowedUrl => targetUrlStr.startsWith(allowedUrl))
    if (!isAllowed) {
      return c.json(
        { error: 'The given `url` query parameter is not allowed' },
        403
      )
    }
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(targetUrlStr)
  } catch (e) {
    return c.json({ error: 'Invalid URL provided in query parameter' }, 400)
  }

  const modifiedHeaders = new Headers(c.req.header())
  modifiedHeaders.delete('origin')

  const proxyRequest = new Request(targetUrl.toString(), {
    method: c.req.method,
    headers: modifiedHeaders,
    body: c.req.method === "POST" ? await c.req.parseBody() as any : null,
    cache: 'no-cache',
    mode: 'cors',
  })

  let res: Response
  try {
    res = await fetch(proxyRequest)
    console.log(res)
  } catch (err: any) {
    console.log(err)
    return c.json(
      { error: `Failed to proxy request: ${err.toString()}` },
      502
    )
  }

  const responseHeaders = new Headers(res.headers)
  responseHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey.startsWith('access-control-') || lowerKey === 'content-encoding') {
      responseHeaders.delete(key)
    }
  })

  responseHeaders.set('X-Forwarded-Host', targetUrl.host)

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  })
})

export default handle(app)