// Cloudflare Worker — secure relay between your GitHub Pages site and
// Anthropic's API. Your real API key lives here as a secret, never in
// the HTML/JS that visitors' browsers can see.
//
// Setup (all in the Cloudflare dashboard, no command line needed):
// 1. Free account at https://dash.cloudflare.com/sign-up
// 2. Workers & Pages → Create → Create Worker → give it a name
//    (e.g. "postman-bot-relay") → Deploy
// 3. Edit code → delete the default code → paste this whole file → Deploy
// 4. Settings → Variables → Add secret:
//      name:  ANTHROPIC_API_KEY
//      value: (your real key from https://console.anthropic.com/settings/keys)
// 5. Copy your Worker's URL (looks like
//      https://postman-bot-relay.YOUR-SUBDOMAIN.workers.dev )
//    and paste it into API_ENDPOINT in the dashboard's <script> —
//    see the matching instructions in the chat reply.

export default {
  async fetch(request, env) {
    // Browsers send a CORS "preflight" OPTIONS request before the real
    // POST — this answers it so the browser is allowed to proceed.
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.text();

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,       // the secret, injected server-side
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    // Stream the response straight through (this keeps the bot's
    // "type as it thinks" streaming effect working exactly as before),
    // just adding the CORS header GitHub Pages needs.
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};
