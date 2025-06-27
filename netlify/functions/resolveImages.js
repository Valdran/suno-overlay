const { google } = require('googleapis');
const fetch = require('node-fetch');

function authSheets() {
  const jwt = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth: jwt });
}

function convertSunoImageUrl(uuid) {
  return `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;
}

async function resolveUUIDFromShortlink(shortlink) {
  try {
    const response = await fetch(shortlink, { method: 'GET', redirect: 'manual' });
    const location = response.headers.get('location');
    if (!location) return null;
    const match = location.match(/\/song\/([\w-]{36})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

exports.handler = async () => {
  const sheets = authSheets();
  const sheetId = process.env.SHEET_ID;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1',
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: 'No data found in sheet.' };
    }

    const headers = rows[0];
    const updatedRows = [...rows];
    const linkIndex = headers.indexOf('AI music link');
    const imageIndex = headers.indexOf('Image');

    if (linkIndex === -1 || imageIndex === -1) {
      return {
        statusCode: 500,
        body: 'Sheet missing required columns: "AI music link" and/or "Image"',
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const link = row[linkIndex];
      const img = row[imageIndex];

      if (!img && link) {
        let uuid = null;

        // Try to extract UUID directly from long-form link
        const directMatch = link.match(/\/song\/([\w-]{36})/);
        if (directMatch) {
          uuid = directMatch[1];
        } else if (link.includes('/s/')) {
          // Resolve shortlink to get UUID
          uuid = await resolveUUIDFromShortlink(link);
        }

        if (uuid) {
          const imageUrl = convertSunoImageUrl(uuid);
          updatedRows[i][imageIndex] = imageUrl;
          console.log(`Row ${i + 1}: Image URL set to ${imageUrl}`);
        }
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: { values: updatedRows },
    });

    return {
      statusCode: 200,
      body: 'Image URLs resolved and updated successfully.',
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
