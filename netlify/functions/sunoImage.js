export async function handler(event) {
  const { link } = event.queryStringParameters;

  if (!link) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing Suno link.' }),
    };
  }

  try {
    // Helper to extract UUID from long URL
    function extractUUIDfromLongUrl(url) {
      const match = url.match(/\/song\/([\w-]{36})/);
      return match ? match[1] : null;
    }

    if (link.startsWith('https://suno.com/song/')) {
      // Long URL - parse UUID directly
      const uuid = extractUUIDfromLongUrl(link);
      if (!uuid) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'UUID not found in long URL.' }),
        };
      }
      const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, imageUrl }),
      };
    } 
    
    else if (link.startsWith('https://suno.com/s/')) {
      // Short URL - resolve redirect to get UUID
      const response = await fetch(link, {
        method: 'GET',
        redirect: 'manual',
      });

      const location = response.headers.get('location');
      if (!location) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'No redirect location found' }),
        };
      }

      const uuid = extractUUIDfromLongUrl(location);
      if (!uuid) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'UUID not found in redirect URL.' }),
        };
      }
      const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, imageUrl }),
      };
    }

    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid Suno link format.' }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch URL.', details: error.message }),
    };
  }
}
