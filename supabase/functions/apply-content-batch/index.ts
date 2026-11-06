// Retired: a one-shot, hash-locked loader used on 2026-11-06 to apply the
// Maths (Edexcel 1MA1) and English Language (AQA 8700) content batches.
Deno.serve(() => new Response(JSON.stringify({ error: 'gone' }), { status: 410, headers: { 'Content-Type': 'application/json' } }))
