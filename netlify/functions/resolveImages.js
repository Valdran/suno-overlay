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

exports.handler = async () => {
  const sheets = authSheets();
  const sheetId = process.env.SHEET_ID;

  try {
    // 1. Get sheet data
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1',
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: 'No data.' };
    }

    const headers = rows[0];
    const updatedRows = [...rows];
    const linkIndex = headers.indexOf('AI music link');
    const imageIndex = headers.indexOf('Image');

    // 2. Loop through rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const link = row[linkIndex];
      const img = row[imageIndex];

      if (!img && link && link.includes('/s/')) {
        // resolve shortlink
        const resolved = await fetch(`https://suno.com/s/${link.split('/s/')[1]}`, {
          method: 'GET',
          redirect: 'manual',
        });

        const location = resolved.headers.get('location');
        const match = location?.match(/\/song\/([\w-]{36})/);
        if (match) {
          const uuid = match[1];
          const imageUrl = `https://cdn2.suno.ai/image_large_${uuid}.jpeg`;

          // Write to row
          updatedRows[i][imageIndex] = imageUrl;
        }
      }
    }

    // 3. Update sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: {
        values: updatedRows,
      },
    });

    return {
      statusCode: 200,
      body: 'Image links resolved and updated.',
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
