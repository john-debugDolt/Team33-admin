// Serverless function to proxy Keycloak token requests
// This bypasses Vercel's HTTP proxy limitation

const KEYCLOAK_URL = 'http://k8s-team33-keycloak-320152ed2f-65380cdab2265c8a.elb.ap-southeast-2.amazonaws.com';
const KEYCLOAK_REALM = 'Team33Casino';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

    // Convert body to URL encoded string if it's an object
    let bodyString;
    if (typeof req.body === 'object') {
      bodyString = new URLSearchParams(req.body).toString();
    } else {
      bodyString = req.body;
    }

    // Forward the request to Keycloak
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyString,
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Keycloak proxy error:', error);
    return res.status(502).json({
      error: 'Failed to connect to authentication server',
      details: error.message
    });
  }
}
