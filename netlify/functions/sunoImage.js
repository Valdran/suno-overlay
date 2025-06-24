export async function handler(event) {
  const { link } = event.queryStringParameters;

  if (!link || !link.startsWith('https://suno.com/s/')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or missing short Suno link.' }),
    };
  }

  try {
    const response = await fetch(link, {
      method: 'GET',
      redirect: 'manual'
    });

    const location = response.headers.get('location');

    if (!location || !location.includes('/song/')) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Could not resolve song UUID from redirect.' }),
      };
    }

    const uuidMatch = location.match(/\/song\/([\w-]{36})/);
    if (!uuidMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'UUID not found in redirected location.' }),
      };
    }

    const uuid = uuidMatch[1];
    const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uuid, imageUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error.', details: error.message }),
    };
  }
}
