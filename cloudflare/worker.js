/**
 * Cloudflare Worker — PPP TV News Auto Poster
 *
 * Triggers /api/automate on your Vercel deployment on a cron schedule.
 * Set these secrets in your Cloudflare Worker environment:
 *   VERCEL_APP_URL  = https://your-app.vercel.app
 *   AUTOMATE_SECRET = same value as in Vercel env vars
 */

export default {
  // Cron handler — runs on schedule defined in wrangler.toml
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutomation(env));
  },

  // HTTP handler — lets you manually trigger via GET/POST to the worker URL
  async fetch(request, env, ctx) {
    if (request.method === "POST" || request.method === "GET") {
      ctx.waitUntil(runAutomation(env));
      return new Response(JSON.stringify({ status: "triggered" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("PPP TV Auto Poster Worker", { status: 200 });
  },
};

async function runAutomation(env) {
  const url = `${env.VERCEL_APP_URL}/api/automate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AUTOMATE_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();
  console.log("[PPP TV] Automation result:", JSON.stringify(result));
  return result;
}
