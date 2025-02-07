import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const config = { runtime: 'edge' }
const app = new Hono().basePath('/api')

app.use('/*', cors())

app.all('/*', async (c) => {
  const { API_URL } = env<{ API_URL: string }>(c as any)
  const body = await c.req.parseBody();
  const url = new URL(c.req.url)
  const target = new URL(url.pathname.replace(/^\/api/, '') + url.search, API_URL || "https://api.meetingbaas.com")
  const res = await fetch(target.toString(), {
    ...c.req.raw,
    method: c.req.method,
    headers: c.req.raw.headers,
    // @ts-ignore
    body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? body : undefined, 
  })
  return new Response(res.body, res)
})

export default handle(app)