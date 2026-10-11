// End-to-End Automated Test Suite for Audit Fixes
import http from 'http';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqBody = options.body
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const headers = { ...options.headers };
    if (reqBody) {
      headers['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const reqOptions = {
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });

    req.on('error', reject);
    if (reqBody) {
      req.write(reqBody);
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log(`\n========================================`);
  console.log(`RUNNING AUDIT FIX VERIFICATION SUITE on ${BASE_URL}`);
  console.log(`========================================\n`);

  // Test 1: Health check
  console.log(`[Test 1] Health Check`);
  const healthRes = await request('/api/health-check');
  assert(healthRes.status === 200, `Health check returned 200 (Got: ${healthRes.status})`);
  assert(healthRes.json && healthRes.json.status === 'online', `Health check status is online`);

  // Test 2: Reject empty / whitespace-only content (Requirement 1 & 2)
  console.log(`\n[Test 2] Reject Empty/Whitespace Upload with HTTP 422`);
  const emptyRes = await request('/api/upload-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      files: [{ name: 'blank.txt', content: '   \n\t  ' }],
    },
  });
  assert(emptyRes.status === 422, `Empty content rejected with 422 (Got: ${emptyRes.status})`);
  assert(
    emptyRes.json && (emptyRes.json.error || '').toLowerCase().includes('empty'),
    `Response indicates content is empty: "${emptyRes.json?.error}"`
  );

  // Test 3: Reject missing bytes and missing content (Requirement 1 & 2)
  console.log(`\n[Test 3] Reject Upload without Bytes or Content with HTTP 422`);
  const missingRes = await request('/api/upload-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      files: [{ name: 'no_payload.pdf' }],
    },
  });
  assert(missingRes.status === 422, `Missing payload rejected with 422 (Got: ${missingRes.status})`);
  assert(
    missingRes.json && (missingRes.json.error || '').toLowerCase().includes('neither valid file bytes'),
    `Response indicates missing bytes: "${missingRes.json?.error}"`
  );

  // Test 4: Missing sample file returns 404, not fake placeholder (Requirement 5)
  console.log(`\n[Test 4] Missing Sample File Returns 404 (No Fake Content)`);
  const sampleRes = await request('/api/sample-files/download/non_existent_sample_doc_9999.pdf');
  assert(sampleRes.status === 404, `Missing sample file returned 404 (Got: ${sampleRes.status})`);
  assert(
    sampleRes.json && (sampleRes.json.error || '').toLowerCase().includes('not found'),
    `Response indicates 404 not found: "${sampleRes.json?.error}"`
  );

  // Test 5: Ingest real document with unique ground-truth marker
  console.log(`\n[Test 5] Ingest Real Document with Unique Markers`);
  const uniqueToken = `PHOENIX_AUDIT_MARKER_${Date.now()}`;
  const uploadReal = await request('/api/upload-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      files: [
        {
          name: 'Phoenix_Audit_Spec.txt',
          content: [
            `System Code: ${uniqueToken}`,
            `Directive: All camera streams must encrypt frames using AES-GCM-256 before telemetry transmission.`,
            `Primary Lead: Dr. Maya Lin (Security Architecture)`,
            `Memory Budget: Dedicated neural cache memory ceiling strictly capped at 256MB per camera channel.`,
            `Schedule Milestone: Cryptographic key rotation validation due 2026-11-20.`,
          ].join('\n'),
          category: 'requirements',
        },
      ],
    },
  });
  assert(uploadReal.status === 200, `Real document uploaded successfully with 200 (Got: ${uploadReal.status})`);
  assert(uploadReal.json?.totalKnowledgeChunks >= 1, `Indexed chunks count >= 1 (Got: ${uploadReal.json?.totalKnowledgeChunks})`);
  assert(uploadReal.json?.storageMode !== undefined, `Storage mode is explicitly declared: ${uploadReal.json?.storageMode}`);

  // Test 6: Search knowledge base returns exact matching chunk
  console.log(`\n[Test 6] Semantic & Lexical Knowledge Base Retrieval`);
  const searchRes = await request('/api/knowledge-base/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'neural cache memory ceiling' },
  });
  assert(searchRes.status === 200, `Search returned 200`);
  assert(searchRes.json?.totalMatches >= 1, `Found matching chunks in knowledge base`);
  const foundChunk = searchRes.json?.results?.[0]?.text || '';
  assert(foundChunk.includes('256MB'), `Retrieved chunk contains exact memory budget text: "${foundChunk.slice(0, 80)}..."`);

  // Test 7: Assistant grounded extractive answer (Requirement 4 & 7)
  console.log(`\n[Test 7] Assistant Grounded Extractive Answer`);
  const askRes = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'What is the neural cache memory ceiling per camera channel?' },
  });
  assert(askRes.status === 200, `Ask assistant returned 200`);
  const answer = askRes.json?.answer || '';
  assert(answer.includes('256MB'), `Answer contains factual evidence "256MB" directly from uploaded document`);
  assert(
    askRes.json?.sources?.includes('Phoenix_Audit_Spec.txt'),
    `Sources cites Phoenix_Audit_Spec.txt (Got: ${JSON.stringify(askRes.json?.sources)})`
  );
  assert(
    askRes.json?.agentUsed === 'Extractive RAG Evidence Agent',
    `Agent used is Extractive RAG Evidence Agent (Got: ${askRes.json?.agentUsed})`
  );

  // Test 8: Unrelated query returns no false claims / no hallucinations
  console.log(`\n[Test 8] Non-Existent Topic Returns Factual Absence (No Hallucination)`);
  const ungroundedRes = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'What is the supersonic aerodynamic drag coefficient?' },
  });
  assert(ungroundedRes.status === 200, `Ask assistant returned 200`);
  assert(
    (ungroundedRes.json?.answer || '').toLowerCase().includes('no relevant evidence was found'),
    `Assistant admits absence of evidence instead of hallucinating: "${ungroundedRes.json?.answer.slice(0, 100)}..."`
  );

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
