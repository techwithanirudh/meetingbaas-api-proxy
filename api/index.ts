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

  const res = await fetch(API_URL || "https://api.meetingbaas.com", {
    ...c.req.raw,
  });
  const newResponse = new Response(res.body, res);
  return newResponse;
});

export default handle(app)