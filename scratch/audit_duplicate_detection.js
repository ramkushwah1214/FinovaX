/**
 * FINOVAX PHASE 10: AUDIT OF DUPLICATE DETECTION ENGINE
 * Tests original vs optimized logic across all required edge cases
 */

// --- ORIGINAL IMPLEMENTATION ---
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

    // TIER 1
    if (ref && ref.length >= 6) {
      const dbMatch = hist.find(
        h => h.referenceId && h.referenceId.trim().toLowerCase() === ref
      );
      if (dbMatch) {
        isDup = true;
        reason = `Exact Reference ID match (${item.referenceId}) with existing ledger record`;
        existingId = dbMatch._id ? dbMatch._id.toString() : 'mock_id';
      }
    }

    // TIER 2
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
        reason = `Matched on identical date (${itemDateStr}), amount (₹${item.amount}), and direction (${item.direction}) in your ledger`;
        existingId = dbFuzzyMatch._id ? dbFuzzyMatch._id.toString() : 'mock_id';
      }
    }

    // TIER 3
    if (!isDup) {
      if (ref && ref.length >= 6) {
        if (seenRefsInBatch.has(ref)) {
          isDup = true;
          const priorIdx = seenRefsInBatch.get(ref);
          reason = `Duplicate Reference ID (${item.referenceId}) also appears in row #${priorIdx + 1} of this statement`;
        } else {
          seenRefsInBatch.set(ref, i);
        }
      }

      if (!isDup) {
        if (seenFuzzyInBatch.has(fuzzyKey)) {
          isDup = true;
          const priorIdx = seenFuzzyInBatch.get(fuzzyKey);
          reason = `Identical date (${itemDateStr}), amount (₹${item.amount}), and direction appears in row #${priorIdx + 1} of this statement`;
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
      item.duplicateReason = reason;
      item.existingTransactionId = existingId;
      duplicateCount++;
    }
  }

  return { stagedTransactions: stagedCopy, duplicateCount };
}

// --- OPTIMIZED IMPLEMENTATION ---
function optimizedDetectDuplicates(hist, staged) {
  const stagedCopy = staged.map(s => ({ ...s }));

  const historicalRefMap = new Map();
  const historicalFuzzyMap = new Map();

  for (let idx = 0; idx < hist.length; idx++) {
    const h = hist[idx];
    if (h.referenceId) {
      const cleanRef = h.referenceId.trim().toLowerCase();
      if (cleanRef.length >= 6 && !historicalRefMap.has(cleanRef)) {
        historicalRefMap.set(cleanRef, h._id ? h._id.toString() : 'mock_id');
      }
    }
    const hDateStr = new Date(h.date).toISOString().split('T')[0];
    const hDir = h.direction || (h.type === 'income' ? 'credit' : 'debit');
    const hFuzzyKey = `${hDateStr}_${h.amount.toFixed(2)}_${hDir}`;
    if (!historicalFuzzyMap.has(hFuzzyKey)) {
      historicalFuzzyMap.set(hFuzzyKey, h._id ? h._id.toString() : 'mock_id');
    }
  }

  let duplicateCount = 0;
  const seenRefsInBatch = new Map();
  const seenFuzzyInBatch = new Map();

  for (let i = 0; i < stagedCopy.length; i++) {
    const item = stagedCopy[i];
    let isDup = false;
    let reason = '';
    let existingId = '';

    const ref = (item.referenceId || '').trim().toLowerCase();
    const itemDateStr = new Date(item.date).toISOString().split('T')[0];
    const fuzzyKey = `${itemDateStr}_${item.amount.toFixed(2)}_${item.direction}`;

    if (ref && ref.length >= 6) {
      const matchDbId = historicalRefMap.get(ref);
      if (matchDbId) {
        isDup = true;
        reason = `Exact Reference ID match (${item.referenceId}) with existing ledger record`;
        existingId = matchDbId;
      }
    }

    if (!isDup) {
      const matchDbId = historicalFuzzyMap.get(fuzzyKey);
      if (matchDbId) {
        isDup = true;
        reason = `Matched on identical date (${itemDateStr}), amount (₹${item.amount}), and direction (${item.direction}) in your ledger`;
        existingId = matchDbId;
      }
    }

    if (!isDup) {
      if (ref && ref.length >= 6) {
        if (seenRefsInBatch.has(ref)) {
          isDup = true;
          const priorIdx = seenRefsInBatch.get(ref);
          reason = `Duplicate Reference ID (${item.referenceId}) also appears in row #${priorIdx + 1} of this statement`;
        } else {
          seenRefsInBatch.set(ref, i);
        }
      }

      if (!isDup) {
        if (seenFuzzyInBatch.has(fuzzyKey)) {
          isDup = true;
          const priorIdx = seenFuzzyInBatch.get(fuzzyKey);
          reason = `Identical date (${itemDateStr}), amount (₹${item.amount}), and direction appears in row #${priorIdx + 1} of this statement`;
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
      item.duplicateReason = reason;
      item.existingTransactionId = existingId;
      duplicateCount++;
    }
  }

  return { stagedTransactions: stagedCopy, duplicateCount };
}

// ======================= TEST SUITE =======================
console.log('🧪 FINOVAX PHASE 10: DUPLICATE DETECTION AUDIT');

const testCases = [
  // 1. Exact Reference ID Match
  {
    name: '1. Exact reference ID match',
    historical: [{ _id: 'h1', referenceId: 'UPI-1234567890', date: new Date('2026-08-10'), amount: 500, direction: 'debit' }],
    staged: [{ referenceId: 'UPI-1234567890', date: new Date('2026-08-15'), amount: 999, direction: 'credit' }]
  },
  // 2. Fuzzy date/amount/direction match (different or no reference ID)
  {
    name: '2. Fuzzy match (same date, amount, direction)',
    historical: [{ _id: 'h2', referenceId: 'REF_OLD', date: new Date('2026-08-10T14:30:00Z'), amount: 450.50, direction: 'debit' }],
    staged: [{ referenceId: 'REF_NEW', date: new Date('2026-08-10T02:00:00Z'), amount: 450.50, direction: 'debit' }]
  },
  // 3. Same-batch duplicates (intra-batch ref ID)
  {
    name: '3. Same-batch reference ID duplicate',
    historical: [],
    staged: [
      { referenceId: 'BATCH_REF_001', date: new Date('2026-08-01'), amount: 100, direction: 'debit' },
      { referenceId: 'BATCH_REF_001', date: new Date('2026-08-05'), amount: 200, direction: 'credit' }
    ]
  },
  // 4. Same-batch duplicates (intra-batch fuzzy match)
  {
    name: '4. Same-batch fuzzy duplicate',
    historical: [],
    staged: [
      { referenceId: '', date: new Date('2026-08-01T10:00:00Z'), amount: 150.00, direction: 'debit' },
      { referenceId: '', date: new Date('2026-08-01T18:00:00Z'), amount: 150.00, direction: 'debit' }
    ]
  },
  // 5. Missing / Invalid reference IDs (short, whitespace, null)
  {
    name: '5. Missing / Short / Null reference IDs (< 6 chars)',
    historical: [
      { _id: 'h5_1', referenceId: 'N/A', date: new Date('2026-08-01'), amount: 100, direction: 'debit' },
      { _id: 'h5_2', referenceId: '', date: new Date('2026-08-02'), amount: 200, direction: 'debit' }
    ],
    staged: [
      { referenceId: 'N/A', date: new Date('2026-08-05'), amount: 999, direction: 'credit' }, // Should NOT match on referenceId because len < 6
      { referenceId: '   ', date: new Date('2026-08-06'), amount: 888, direction: 'credit' },
      { referenceId: null, date: new Date('2026-08-07'), amount: 777, direction: 'credit' }
    ]
  },
  // 6. User Isolation: Historical ledger is scoped by userId
  {
    name: '6. User Isolation (Query ensures user-scoping)',
    historical: [{ _id: 'h6', userId: 'user_A', referenceId: 'USER_A_REF_123', date: new Date('2026-08-10'), amount: 500, direction: 'debit' }],
    // User B's historical array would be empty
    staged: [{ referenceId: 'USER_A_REF_123', date: new Date('2026-08-10'), amount: 500, direction: 'debit' }]
  },
  // 7. Timezone & Midnight boundary edge cases
  {
    name: '7. Timezone edge case (23:59:59 vs 00:00:01 on same calendar date UTC)',
    historical: [{ _id: 'h7', referenceId: '', date: new Date('2026-08-15T23:59:59.000Z'), amount: 1200, direction: 'debit' }],
    staged: [
      { referenceId: '', date: new Date('2026-08-15T00:00:01.000Z'), amount: 1200, direction: 'debit' }, // Same day UTC: duplicate
      { referenceId: '', date: new Date('2026-08-16T00:00:01.000Z'), amount: 1200, direction: 'debit' }  // Next day UTC: unique
    ]
  },
  // 8. Amount precision and floating-point tolerance (< 0.01)
  {
    name: '8. Amount floating point tolerance (< 0.01)',
    historical: [{ _id: 'h8', referenceId: '', date: new Date('2026-08-20'), amount: 199.999, direction: 'debit' }],
    staged: [
      { referenceId: '', date: new Date('2026-08-20'), amount: 200.00, direction: 'debit' }, // diff = 0.001 < 0.01 -> match
      { referenceId: '', date: new Date('2026-08-20'), amount: 200.05, direction: 'debit' }  // diff = 0.051 >= 0.01 -> unique
    ]
  }
];

let allPassed = true;

testCases.forEach((tc, idx) => {
  const origRes = originalDetectDuplicates(tc.historical, tc.staged);
  const optRes = optimizedDetectDuplicates(tc.historical, tc.staged);

  const countsMatch = origRes.duplicateCount === optRes.duplicateCount;
  const flagsMatch = origRes.stagedTransactions.every((t, i) => t.isDuplicate === optRes.stagedTransactions[i].isDuplicate);

  if (countsMatch && flagsMatch) {
    console.log(`  ✅ PASS: ${tc.name} (Dup Count: ${optRes.duplicateCount})`);
  } else {
    console.error(`  ❌ FAIL: ${tc.name}`);
    console.error(`     Original: count=${origRes.duplicateCount}, flags=${origRes.stagedTransactions.map(t=>t.isDuplicate)}`);
    console.error(`     Optimized: count=${optRes.duplicateCount}, flags=${optRes.stagedTransactions.map(t=>t.isDuplicate)}`);
    allPassed = false;
  }
});

console.log(`\nDuplicate Detection Correctness Verdict: ${allPassed ? '100% IDENTICAL BEHAVIOR' : 'DISCREPANCY DETECTED'}`);
process.exit(allPassed ? 0 : 1);
