export async function handler(event) {
  // ✅ Allow both localhost & Netlify origins
  const allowedOrigins = [
    'http://localhost:4321',
    'http://localhost:8888',
    'https://walletdps.netlify.app',
    'https://walletdps.netlify.com',
  ];

  const origin = event.headers.origin || '';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';

  // ✅ Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-App-Env, X-App-Version, X-Requested-With, Content-Type, Authorization, Origin, Accept',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  // ✅ Build target URL dynamically
  const targetUrl = `https://api.mytonwallet.org${event.path.replace('/.netlify/functions/proxy', '')}`;

  try {
    // ✅ Prepare fetch options
    const fetchOptions = {
      method: event.httpMethod,
      headers: {
        ...event.headers,
        'X-App-Env': event.headers['x-app-env'] || event.headers['X-App-Env'] || 'Production',
      },
    };

    // ⚙️ Only add body if method is NOT GET or HEAD
    if (!['GET', 'HEAD'].includes(event.httpMethod) && event.body) {
      fetchOptions.body = event.body;
    }

    // ✅ Send request to target API
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    // ✅ Return final response
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-App-Env, X-App-Version, X-Requested-With, Content-Type, Authorization, Origin, Accept',
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: data,
    };
  } catch (error) {
    // ❌ Handle error
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
}