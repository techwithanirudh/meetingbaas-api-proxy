import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const config = { runtime: 'edge' }
const app = new Hono().basePath('/api')

app.use('/*', cors())

app.all('/*', async (c) => {
  const { API_URL } = env<{ API_URL: string }>(c as any)
  const u = new URL(c.req.url)
  const t = new URL(u.pathname.replace(/^\/api/, '') + u.search, API_URL || "https://api.meetingbaas.com")
  const res = await fetch(t.toString(), {
    ...c.req.raw,
    method: c.req.method,
    headers: c.req.raw.headers,
  })
  return new Response(res.body, res)
})

export default handle(app)