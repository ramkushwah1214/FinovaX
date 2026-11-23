/**
 * FINOVAX PHASE 10: AUDIT OF CONCURRENT INGESTION BATCHING
 */

async function testConcurrency() {
  console.log('🧪 FINOVAX PHASE 10: CONCURRENT INGESTION AUDIT');

  const TOTAL_RECORDS = 150;
  const CHUNK_SIZE = 20;

  let activeRequests = 0;
  let maxObservedConcurrency = 0;

  // Mock categorizer tracking concurrency and simulating network latency
  async function mockCategorize(desc, amount, dir) {
    activeRequests++;
    if (activeRequests > maxObservedConcurrency) {
      maxObservedConcurrency = activeRequests;
    }
    // Simulate random async network delay 5-20ms
    await new Promise(r => setTimeout(r, 5 + Math.random() * 15));
    activeRequests--;
    return { category: 'Food', subcategory: 'Dining', confidence: 0.95 };
  }

  function mockNormalize(raw, i, catOutcome) {
    return {
      index: i,
      rawId: raw.id,
      description: raw.description,
      category: catOutcome.category
    };
  }

  const rawRecords = [];
  for (let i = 0; i < TOTAL_RECORDS; i++) {
    rawRecords.push({ id: 'raw_' + i, description: 'Transaction ' + i, amount: 100 + i, direction: 'debit' });
  }

  // Run chunked implementation
  const stagedInitial = new Array(rawRecords.length);
  const startTime = Date.now();

  for (let c = 0; c < rawRecords.length; c += CHUNK_SIZE) {
    const chunk = rawRecords.slice(c, c + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (raw, idx) => {
        const i = c + idx;
        const catOutcome = await mockCategorize(raw.description, raw.amount, raw.direction);
        stagedInitial[i] = mockNormalize(raw, i, catOutcome);
      })
    );
  }

  const elapsed = Date.now() - startTime;

  console.log(`- Total Records Processed: ${stagedInitial.length}`);
  console.log(`- Configured Chunk Size: ${CHUNK_SIZE}`);
  console.log(`- Max Observed In-Flight Concurrency: ${maxObservedConcurrency}`);
  console.log(`- Processing Time: ${elapsed}ms`);

  const concurrencySafe = maxObservedConcurrency <= CHUNK_SIZE;
  console.log(`  ${concurrencySafe ? '✅ PASS' : '❌ FAIL'}: Max concurrency (${maxObservedConcurrency}) <= ${CHUNK_SIZE}`);

  const lengthPreserved = stagedInitial.length === TOTAL_RECORDS && !stagedInitial.includes(undefined);
  console.log(`  ${lengthPreserved ? '✅ PASS' : '❌ FAIL'}: All ${TOTAL_RECORDS} rows populated without loss or holes`);

  const orderPreserved = stagedInitial.every((item, idx) => item.index === idx && item.rawId === 'raw_' + idx);
  console.log(`  ${orderPreserved ? '✅ PASS' : '❌ FAIL'}: Original transaction order 100% preserved`);

  process.exit(concurrencySafe && lengthPreserved && orderPreserved ? 0 : 1);
}

testConcurrency().catch(console.error);
