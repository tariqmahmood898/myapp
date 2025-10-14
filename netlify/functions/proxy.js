export async function handler(event) {
  // ✅ Allowed origins domain list (localhost + Netlify)
  const allowedOrigins = [
    'http://localhost:4321',
    'http://127.0.0.1:4321',
    'https://dpsmult.netlify.app',
    'http://localhost:8888',
    'https://walletdps.netlify.app',
    'https://walletdps.netlify.com',
    'https://dpsmult.netlify.app',






    
  ];
  const origin = event.headers.origin || '*';
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : 'https://walletdps.netlify.app';

  // ✅ Common CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
          'x-app-env, X-App-Env, X-App-Version, X-Requested-With, Content-Type, Authorization, Origin, Accept, X-App-Clientid',
    'Access-Control-Max-Age': '86400',
  };

  // ✅ Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // ✅ Build target URL safely
  const path = event.path.replace('/.netlify/functions/proxy', '');
  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const targetUrl = `https://api.mytonwallet.org${path}${query}`;

  // ✅ If it's a live stream request
  if (path.includes('/live')) {
    return await streamLiveData(targetUrl, corsHeaders);
  }

  // ✅ Normal one-time fetch
  try {
    const fetchOptions = {
      method: event.httpMethod,
      headers: {
        ...event.headers,
        'X-App-Env': event.headers['x-app-env'] || event.headers['X-App-Env'] || 'Production',
      },
    };
    if (!['GET', 'HEAD'].includes(event.httpMethod) && event.body) {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// 🧠 Auto-refresh live mode (every 3 seconds)
async function streamLiveData(targetUrl, corsHeaders) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: connected\ndata: Stream started\n\n`));
      let last = null;

      const sendData = async () => {
        try {
          const res = await fetch(targetUrl);
          const text = await res.text();
          if (text !== last) {
            last = text;
            controller.enqueue(encoder.encode(`data: ${text}\n\n`));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${err.message}\n\n`));
        }
      };

      await sendData();
      const interval = setInterval(sendData, 3000);

      // Stop after 15 minutes
      setTimeout(() => {
        clearInterval(interval);
        controller.enqueue(encoder.encode(`event: end\ndata: closed\n\n`));
        controller.close();
      }, 15 * 60 * 1000);
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  });
}
