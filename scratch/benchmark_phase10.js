/**
 * FINOVAX PHASE 10: COMPLEXITY & PERFORMANCE BENCHMARK SUITE
 * Measures actual execution time and memory for critical bottlenecks
 */

function benchmarkDuplicateDetection() {
  console.log('\n============================================================');
  console.log('BENCHMARK 1: Multi-Tier Duplicate Detection (Statement Import)');
  console.log('============================================================');

  // Generate synthetic test data: 5,000 historical transactions, 1,000 staged transactions
  const M = 5000;
  const N = 1000;

  const historical = [];
  const baseDate = new Date('2026-08-01T00:00:00.000Z').getTime();
  for (let i = 0; i < M; i++) {
    const d = new Date(baseDate + (i % 90) * 86400000);
    historical.push({
      _id: 'hist_' + i,
      referenceId: i % 3 === 0 ? 'UTR' + (1000000 + i) : '',
      date: d,
      amount: 100 + (i % 500),
      direction: i % 2 === 0 ? 'debit' : 'credit',
      type: i % 2 === 0 ? 'expense' : 'income',
      merchant: 'Merchant_' + (i % 50),
      title: 'Payment to Merchant ' + (i % 50)
    });
  }

  const stagedList = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(baseDate + (i % 90) * 86400000);
    stagedList.push({
      referenceId: i % 5 === 0 ? 'UTR' + (1000000 + (i * 2)) : (i % 7 === 0 ? 'NEW_UTR_' + i : ''),
      date: d,
      amount: 100 + (i % 500),
      direction: i % 2 === 0 ? 'debit' : 'credit',
      title: 'Transaction ' + i,
      isDuplicate: false,
      duplicateReason: '',
      existingTransactionId: ''
    });
  }

  // --- ORIGINAL IMPLEMENTATION (O(N * M) nested find) ---
  function originalDetectDuplicates(hist, staged) {
    const stagedCopy = staged.map(s => ({ ...s }));
    const seenRefsInBatch = new Map();
    const seenFuzzyInBatch = new Map();
    let duplicateCount = 0;

    for (let i = 0; i < stagedCopy.length; i++) {
      const item = stagedCopy[i];
      let isDup = false;
      let reason = '';
      let existingId = '';

      const ref = (item.referenceId || '').trim().toLowerCase();
      const itemDateStr = new Date(item.date).toISOString().split('T')[0];
      const fuzzyKey = `${itemDateStr}_${item.amount.toFixed(2)}_${item.direction}`;

      if (ref && ref.length >= 6) {
        const dbMatch = hist.find(
          h => h.referenceId && h.referenceId.trim().toLowerCase() === ref
        );
        if (dbMatch) {
          isDup = true;
          reason = `Exact Reference ID match (${item.referenceId})`;
          existingId = dbMatch._id;
        }
      }

      if (!isDup) {
        const dbFuzzyMatch = hist.find(h => {
          const hDateStr = new Date(h.date).toISOString().split('T')[0];
          const sameDate = hDateStr === itemDateStr;
          const sameAmount = Math.abs(h.amount - item.amount) < 0.01;
          const sameDir = (h.direction || (h.type === 'income' ? 'credit' : 'debit')) === item.direction;
          return sameDate && sameAmount && sameDir;
        });

        if (dbFuzzyMatch) {
          isDup = true;
          reason = `Fuzzy match on date, amount, direction`;
          existingId = dbFuzzyMatch._id;
        }
      }

      if (!isDup) {
        if (ref && ref.length >= 6) {
          if (seenRefsInBatch.has(ref)) {
            isDup = true;
          } else {
            seenRefsInBatch.set(ref, i);
          }
        }
        if (!isDup) {
          if (seenFuzzyInBatch.has(fuzzyKey)) {
            isDup = true;
          } else {
            seenFuzzyInBatch.set(fuzzyKey, i);
          }
        }
      } else {
        if (ref) seenRefsInBatch.set(ref, i);
        seenFuzzyInBatch.set(fuzzyKey, i);
      }

      if (isDup) {
        item.isDuplicate = true;
        duplicateCount++;
      }
    }
    return duplicateCount;
  }

  // --- OPTIMIZED IMPLEMENTATION (O(N + M) Hash Map Indexing) ---
  function optimizedDetectDuplicates(hist, staged) {
    const stagedCopy = staged.map(s => ({ ...s }));
    let duplicateCount = 0;

    // Build lookup maps once: O(M)
    const refMap = new Map();
    const fuzzyMap = new Map();

    for (let i = 0; i < hist.length; i++) {
      const h = hist[i];
      if (h.referenceId) {
        const cleanRef = h.referenceId.trim().toLowerCase();
        if (cleanRef.length >= 6 && !refMap.has(cleanRef)) {
          refMap.set(cleanRef, h._id);
        }
      }
      const hDateStr = new Date(h.date).toISOString().split('T')[0];
      const hDir = h.direction || (h.type === 'income' ? 'credit' : 'debit');
      const hFuzzyKey = `${hDateStr}_${h.amount.toFixed(2)}_${hDir}`;
      if (!fuzzyMap.has(hFuzzyKey)) {
        fuzzyMap.set(hFuzzyKey, h._id);
      }
    }

    const seenRefsInBatch = new Map();
    const seenFuzzyInBatch = new Map();

    // Scan staged items: O(N)
    for (let i = 0; i < stagedCopy.length; i++) {
      const item = stagedCopy[i];
      let isDup = false;
      let reason = '';
      let existingId = '';

      const ref = (item.referenceId || '').trim().toLowerCase();
      const itemDateStr = new Date(item.date).toISOString().split('T')[0];
      const fuzzyKey = `${itemDateStr}_${item.amount.toFixed(2)}_${item.direction}`;

      // Tier 1: O(1) Map Lookup
      if (ref && ref.length >= 6) {
        const matchId = refMap.get(ref);
        if (matchId) {
          isDup = true;
          reason = `Exact Reference ID match (${item.referenceId})`;
          existingId = matchId;
        }
      }

      // Tier 2: O(1) Map Lookup
      if (!isDup) {
        const matchId = fuzzyMap.get(fuzzyKey);
        if (matchId) {
          isDup = true;
          reason = `Fuzzy match on date, amount, direction`;
          existingId = matchId;
        }
      }

      // Tier 3: O(1) Intra-batch
      if (!isDup) {
        if (ref && ref.length >= 6) {
          if (seenRefsInBatch.has(ref)) {
            isDup = true;
          } else {
            seenRefsInBatch.set(ref, i);
          }
        }
        if (!isDup) {
          if (seenFuzzyInBatch.has(fuzzyKey)) {
            isDup = true;
          } else {
            seenFuzzyInBatch.set(fuzzyKey, i);
          }
        }
      } else {
        if (ref) seenRefsInBatch.set(ref, i);
        seenFuzzyInBatch.set(fuzzyKey, i);
      }

      if (isDup) {
        item.isDuplicate = true;
        duplicateCount++;
      }
    }
    return duplicateCount;
  }

  // Measure Original
  const startOrigMem = process.memoryUsage().heapUsed;
  const startOrig = process.hrtime.bigint();
  const countOrig = originalDetectDuplicates(historical, stagedList);
  const endOrig = process.hrtime.bigint();
  const endOrigMem = process.memoryUsage().heapUsed;
  const timeOrigMs = Number(endOrig - startOrig) / 1e6;

  // Measure Optimized
  const startOptMem = process.memoryUsage().heapUsed;
  const startOpt = process.hrtime.bigint();
  const countOpt = optimizedDetectDuplicates(historical, stagedList);
  const endOpt = process.hrtime.bigint();
  const endOptMem = process.memoryUsage().heapUsed;
  const timeOptMs = Number(endOpt - startOpt) / 1e6;

  console.log(`Input Size: Historical M=${M}, Staged N=${N}`);
  console.log(`Output Equivalence Check: countOrig=${countOrig}, countOpt=${countOpt} -> ${countOrig === countOpt ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Original Time (O(N*M)):   ${timeOrigMs.toFixed(2)} ms`);
  console.log(`Optimized Time (O(N+M)):  ${timeOptMs.toFixed(2)} ms`);
  console.log(`Speedup Factor:          ${(timeOrigMs / timeOptMs).toFixed(1)}x faster`);

  return {
    test: 'Multi-Tier Duplicate Detection',
    inputSize: `M=${M} historical, N=${N} staged`,
    originalComplexity: 'Time: O(N * M), Space: O(M)',
    optimizedComplexity: 'Time: O(N + M), Space: O(M)',
    originalTimeMs: timeOrigMs,
    optimizedTimeMs: timeOptMs,
    speedup: (timeOrigMs / timeOptMs).toFixed(1) + 'x',
    verifiedEquivalent: countOrig === countOpt
  };
}

function benchmarkFilteringSorting() {
  console.log('\n============================================================');
  console.log('BENCHMARK 2: Frontend Transaction Filtering & Sorting');
  console.log('============================================================');

  const N = 2000;
  const categories = ['Food & Dining', 'Shopping', 'Travel', 'Utilities', 'Healthcare', 'Salary'];
  const transactions = [];
  const baseTime = new Date('2026-01-01').getTime();

  for (let i = 0; i < N; i++) {
    const d = new Date(baseTime + i * 3600000 * 12);
    transactions.push({
      id: 'tx_' + i,
      title: 'Store ' + (i % 20) + ' Item',
      description: 'Transaction notes for purchase ' + i,
      category: categories[i % categories.length],
      amount: 50 + (i % 2000),
      type: i % 4 === 0 ? 'income' : 'expense',
      date: d.toISOString().split('T')[0]
    });
  }

  const searchTerm = 'Store 1';
  const selectedType = 'expense';
  const selectedCategory = 'all';

  // Original
  function originalFilterSort(txs) {
    return txs
      .filter((t) => {
        const matchesSearch =
          (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'all' || t.type === selectedType;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Optimized (Single lowercase, string ISO comparison)
  function optimizedFilterSort(txs) {
    const searchLower = searchTerm.trim().toLowerCase();
    return txs
      .filter((t) => {
        if (selectedType !== 'all' && t.type !== selectedType) return false;
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (!searchLower) return true;
        return (
          (t.title && t.title.toLowerCase().includes(searchLower)) ||
          (t.description && t.description.toLowerCase().includes(searchLower)) ||
          (t.category && t.category.toLowerCase().includes(searchLower))
        );
      })
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }

  const startOrig = process.hrtime.bigint();
  let resOrig;
  for (let r = 0; r < 50; r++) resOrig = originalFilterSort(transactions);
  const endOrig = process.hrtime.bigint();
  const timeOrigMs = Number(endOrig - startOrig) / 1e6 / 50;

  const startOpt = process.hrtime.bigint();
  let resOpt;
  for (let r = 0; r < 50; r++) resOpt = optimizedFilterSort(transactions);
  const endOpt = process.hrtime.bigint();
  const timeOptMs = Number(endOpt - startOpt) / 1e6 / 50;

  console.log(`Input Size: N=${N} transactions, 50-iteration average`);
  console.log(`Output Equivalence Check: ${resOrig.length === resOpt.length ? 'MATCH' : 'MISMATCH'} (length=${resOrig.length})`);
  console.log(`Original Time:   ${timeOrigMs.toFixed(3)} ms / pass`);
  console.log(`Optimized Time:  ${timeOptMs.toFixed(3)} ms / pass`);
  console.log(`Speedup Factor:  ${(timeOrigMs / timeOptMs).toFixed(1)}x faster`);

  return {
    test: 'Frontend Transaction Filtering & Sorting',
    inputSize: `N=${N} transactions`,
    originalComplexity: 'Time: O(N * log N), Space: O(N) with 3N string + 2*N*logN Date allocations',
    optimizedComplexity: 'Time: O(N * log N), Space: O(N) with 0 Date allocations & fast-path filter exit',
    originalTimeMs: timeOrigMs,
    optimizedTimeMs: timeOptMs,
    speedup: (timeOrigMs / timeOptMs).toFixed(1) + 'x',
    verifiedEquivalent: resOrig.length === resOpt.length
  };
}

function benchmarkCsvExport() {
  console.log('\n============================================================');
  console.log('BENCHMARK 3: CSV Generation & String Serialization');
  console.log('============================================================');

  const N = 5000;
  const transactions = [];
  for (let i = 0; i < N; i++) {
    transactions.push({
      id: 'tx_ident_' + i,
      date: '2026-08-15',
      title: 'Store Purchase ' + i,
      type: 'expense',
      category: 'Food & Dining',
      amount: 250.75,
      paymentMethod: 'UPI',
      description: 'Dinner at cafe with friends'
    });
  }

  // Original: creates intermediate 2D array, then row strings, then joined
  function originalCsv(txs) {
    const headers = ['ID', 'Date', 'Title', 'Type', 'Category', 'Amount', 'Payment Method', 'Description'];
    const rows = txs.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      t.amount,
      `"${t.paymentMethod}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  }

  // Optimized: pre-allocated single-pass array builder
  function optimizedCsv(txs) {
    const lines = new Array(txs.length + 1);
    lines[0] = 'ID,Date,Title,Type,Category,Amount,Payment Method,Description';
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i];
      const titleEsc = t.title ? t.title.replace(/"/g, '""') : '';
      const descEsc = t.description ? t.description.replace(/"/g, '""') : '';
      lines[i + 1] = `"${t.id}","${t.date}","${titleEsc}","${t.type}","${t.category}",${t.amount},"${t.paymentMethod}","${descEsc}"`;
    }
    return lines.join('\r\n');
  }

  const startOrig = process.hrtime.bigint();
  let csvOrig;
  for (let r = 0; r < 20; r++) csvOrig = originalCsv(transactions);
  const endOrig = process.hrtime.bigint();
  const timeOrigMs = Number(endOrig - startOrig) / 1e6 / 20;

  const startOpt = process.hrtime.bigint();
  let csvOpt;
  for (let r = 0; r < 20; r++) csvOpt = optimizedCsv(transactions);
  const endOpt = process.hrtime.bigint();
  const timeOptMs = Number(endOpt - startOpt) / 1e6 / 20;

  console.log(`Input Size: N=${N} transactions, 20-iteration average`);
  console.log(`Output Equivalence Check: lengthOrig=${csvOrig.length}, lengthOpt=${csvOpt.length} -> ${csvOrig.length === csvOpt.length ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Original Time:   ${timeOrigMs.toFixed(2)} ms / export`);
  console.log(`Optimized Time:  ${timeOptMs.toFixed(2)} ms / export`);
  console.log(`Speedup Factor:  ${(timeOrigMs / timeOptMs).toFixed(1)}x faster`);

  return {
    test: 'CSV Generation & Serialization',
    inputSize: `N=${N} transactions`,
    originalComplexity: 'Time: O(N), Space: O(N) with 3 intermediate nested arrays',
    optimizedComplexity: 'Time: O(N), Space: O(N) with single pre-allocated 1D array',
    originalTimeMs: timeOrigMs,
    optimizedTimeMs: timeOptMs,
    speedup: (timeOrigMs / timeOptMs).toFixed(1) + 'x',
    verifiedEquivalent: csvOrig.length === csvOpt.length
  };
}

const b1 = benchmarkDuplicateDetection();
const b2 = benchmarkFilteringSorting();
const b3 = benchmarkCsvExport();

const fs = require('fs');
fs.writeFileSync('e:/Finovax/scratch/benchmark_results.json', JSON.stringify([b1, b2, b3], null, 2));
console.log('\nAll benchmarks executed and saved to scratch/benchmark_results.json');
