import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const config = {
  runtime: 'edge'
}

const app = new Hono().basePath('/api')

app.use('/*', cors())
app.all('/*', async (c) => {
  const { API_URL } = env<{ API_URL: string }>(c as any)
  const routePath = c.req.path.replace(/^\/api/, '');
  const targetUrl = new URL(routePath, API_URL || "https://api.meetingbaas.com").toString();
console.log(c.req.raw.headers)
  const res = await fetch(targetUrl, {
    ...c.req.raw,
    headers: c.req.raw.headers
  });
  const newResponse = new Response(res.body, res);
  return newResponse;
});

export default handle(app)