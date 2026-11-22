import mongoose from 'mongoose';
import { IStagedTransaction } from '../../models/StatementImport';
import { Transaction } from '../../models/Transaction';

export interface DuplicateDetectionResult {
  stagedTransactions: IStagedTransaction[];
  duplicateCount: number;
}

/**
 * Multi-tier duplicate detection against user's database records AND within the batch itself
 */
export async function detectDuplicatesMultiTier(
  userId: mongoose.Types.ObjectId,
  stagedList: IStagedTransaction[]
): Promise<DuplicateDetectionResult> {
  // Query historical transactions for user
  const historical = await Transaction.find({ userId })
    .select('_id date amount direction referenceId merchant title importBatchId')
    .lean();

  // Pre-index historical ledger records into high-performance hash maps: O(M) time & space
  // Replaces O(N * M) repeated linear scans with O(1) hash table lookups
  const historicalRefMap = new Map<string, string>(); // ref -> dbId
  const historicalFuzzyMap = new Map<string, string>(); // fuzzyKey -> dbId

  for (let idx = 0; idx < historical.length; idx++) {
    const h = historical[idx];
    if (h.referenceId) {
      const cleanRef = h.referenceId.trim().toLowerCase();
      if (cleanRef.length >= 6 && !historicalRefMap.has(cleanRef)) {
        historicalRefMap.set(cleanRef, h._id.toString());
      }
    }
    const hDateStr = new Date(h.date).toISOString().split('T')[0];
    const hDir = h.direction || (h.type === 'income' ? 'credit' : 'debit');
    const hFuzzyKey = `${hDateStr}_${h.amount.toFixed(2)}_${hDir}`;
    if (!historicalFuzzyMap.has(hFuzzyKey)) {
      historicalFuzzyMap.set(hFuzzyKey, h._id.toString());
    }
  }

  let duplicateCount = 0;

  // Track seen items within this batch for intra-batch duplicate detection
  const seenRefsInBatch = new Map<string, number>(); // ref -> index
  const seenFuzzyInBatch = new Map<string, number>(); // date_amount_dir -> index

  for (let i = 0; i < stagedList.length; i++) {
    const item = stagedList[i];
    let isDup = false;
    let reason = '';
    let existingId = '';

    const ref = (item.referenceId || '').trim().toLowerCase();
    const itemDateStr = new Date(item.date).toISOString().split('T')[0];
    const fuzzyKey = `${itemDateStr}_${item.amount.toFixed(2)}_${item.direction}`;

    // --- TIER 1: Exact Reference ID / UTR against MongoDB Historical Ledger (O(1) Map Lookup) ---
    if (ref && ref.length >= 6) {
      const matchDbId = historicalRefMap.get(ref);
      if (matchDbId) {
        isDup = true;
        reason = `Exact Reference ID match (${item.referenceId}) with existing ledger record`;
        existingId = matchDbId;
      }
    }

    // --- TIER 2: Same-day + Same-amount + Same-direction against Historical Ledger (O(1) Map Lookup) ---
    if (!isDup) {
      const matchDbId = historicalFuzzyMap.get(fuzzyKey);
      if (matchDbId) {
        isDup = true;
        reason = `Matched on identical date (${itemDateStr}), amount (₹${item.amount}), and direction (${item.direction}) in your ledger`;
        existingId = matchDbId;
      }
    }

    // --- TIER 3: Intra-batch Duplicate Detection (Duplicate inside the same uploaded statement) ---
    if (!isDup) {
      if (ref && ref.length >= 6) {
        if (seenRefsInBatch.has(ref)) {
          isDup = true;
          const priorIdx = seenRefsInBatch.get(ref)!;
          reason = `Duplicate Reference ID (${item.referenceId}) also appears in row #${priorIdx + 1} of this statement`;
        } else {
          seenRefsInBatch.set(ref, i);
        }
      }

      if (!isDup) {
        if (seenFuzzyInBatch.has(fuzzyKey)) {
          isDup = true;
          const priorIdx = seenFuzzyInBatch.get(fuzzyKey)!;
          reason = `Identical date (${itemDateStr}), amount (₹${item.amount}), and direction appears in row #${priorIdx + 1} of this statement`;
        } else {
          seenFuzzyInBatch.set(fuzzyKey, i);
        }
      }
    } else {
      // Still record in seen maps so later rows also detect
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

  return {
    stagedTransactions: stagedList,
    duplicateCount
  };
}

