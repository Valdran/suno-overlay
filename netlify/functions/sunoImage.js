const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { link } = event.queryStringParameters;

  if (!link || !link.startsWith('https://suno.com/s/')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or missing short Suno link.' }),
    };
  }

  try {
    // Follow redirect manually
    const res = await fetch(link, {
      method: 'GET',
      redirect: 'manual',
    });

    const location = res.headers.get('location');

    if (!location || !location.includes('/song/')) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Could not resolve song UUID from short link.' }),
      };
    }

    const uuidMatch = location.match(/\/song\/([\w-]{36})/);
    if (!uuidMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'UUID not found in redirect.' }),
      };
    }

    const uuid = uuidMatch[1];
    const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;

    return {
      statusCode: 200,
      body: JSON.stringify({ uuid, imageUrl }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to resolve Suno link.', details: err.message }),
    };
  }
};
