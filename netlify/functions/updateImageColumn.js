const { google } = require('googleapis');
const fetch = require('node-fetch');

exports.handler = async () => {
  const SHEET_ID = process.env.SHEET_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables.' }),
    };
  }

  try {
    const auth = new google.auth.JWT(
      CLIENT_EMAIL,
      null,
      PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = 'Sheet1';
    const range = `${sheetName}!A:F`;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const rows = result.data.values;
    if (!rows || rows.length === 0) {
      return { statusCode: 200, body: 'No data found.' };
    }

    const header = rows[0];
    const aiLinkIndex = header.indexOf('AI music link');
    const imageIndex = header.indexOf('Image');

    if (aiLinkIndex === -1 || imageIndex === -1) {
      return { statusCode: 400, body: 'Missing column headers.' };
    }

    const updates = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const shortLink = row[aiLinkIndex];
      const imageVal = row[imageIndex];

      if (shortLink?.includes('/s/') && (!imageVal || imageVal.trim() === '')) {
        try {
          const res = await fetch(`https://suno.com/s/${shortLink.split('/s/')[1]}`, {
            method: 'GET',
            redirect: 'manual'
          });

          const loc = res.headers.get('location');
          const match = loc && loc.match(/\/song\/([\w-]{36})/);
          if (match) {
            const uuid = match[1];
            const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;
            row[imageIndex] = imageUrl;
          }
        } catch (e) {
          console.warn(`Failed to resolve: ${shortLink}`, e);
        }
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    return { statusCode: 200, body: 'Image column updated successfully.' };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error accessing sheet', details: err.message }),
    };
  }
};
