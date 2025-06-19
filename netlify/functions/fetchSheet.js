export async function handler(event, context) {
  const res = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSsV-TRNygrIsnsAZNB-nO5NEOand8W-ywRl1v4YYGLMOoiEcbknkVWsU_aI0VYzPkPywdHdTM-0enj/pub?output=csv");
  const text = await res.text();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: text
  };
}
