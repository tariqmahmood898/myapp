export async function handler(event) {
  // ✅ Allowed origins (localhost + Netlify)
  const allowedOrigins = [
    'http://localhost:4321',
    'http://127.0.0.1:4321',
    'http://localhost:8888',
    'https://walletdps.netlify.app',
  ];
  const origin = event.headers.origin || '*';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : 'https://walletdps.netlify.app';

  // ✅ Common CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'x-app-env, X-App-Env, X-App-Version, X-Requested-With, Content-Type, Authorization, Origin, Accept',
    'Access-Control-Max-Age': '86400',
  };

  // ✅ Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // ✅ Build target URL safely (supports ?query=params)
  const path = event.path.replace('/.netlify/functions/proxy', '');
  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const targetUrl = `https://api.mytonwallet.org${path}${query}`;

  try {
    // ✅ Only include body for non-GET methods
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

    // ✅ Make API call
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    // ✅ Return raw data (no modification)
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: data,
    };
  } catch (error) {
    // ✅ Fallback error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
}