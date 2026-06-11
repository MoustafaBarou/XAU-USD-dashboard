// Plain JavaScript test function - no TypeScript compilation needed.
// Vercel detects .js files in /api with 100% reliability.
// If THIS returns JSON but the .ts files 404, the problem is TS compilation.
// Visit /api/hello to test.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    message: 'Vercel serverless functions ARE working.',
    time: new Date().toISOString(),
  });
}
