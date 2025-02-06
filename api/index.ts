import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { env } from 'hono/adapter'

export const config = {
  runtime: 'edge'
}

const app = new Hono().basePath('/')

app.all('/*', async (c) => {
  const { API_URL } = env<{ API_URL: string }>(c)

  const res = await fetch(API_URL || "https://api.meetingbaas.com", {
    ...c.req.raw,
  });
  const newResponse = new Response(res.body, res);
  return newResponse;
});

export default handle(app)