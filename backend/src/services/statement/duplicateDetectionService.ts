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

    // --- TIER 1: Exact Reference ID / UTR against MongoDB Historical Ledger ---
    if (ref && ref.length >= 6) {
      const dbMatch = historical.find(
        h => h.referenceId && h.referenceId.trim().toLowerCase() === ref
      );
      if (dbMatch) {
        isDup = true;
        reason = `Exact Reference ID match (${item.referenceId}) with existing ledger record`;
        existingId = dbMatch._id.toString();
      }
    }

    // --- TIER 2: Same-day + Same-amount + Same-direction against MongoDB Historical Ledger ---
    if (!isDup) {
      const dbFuzzyMatch = historical.find(h => {
        const hDateStr = new Date(h.date).toISOString().split('T')[0];
        const sameDate = hDateStr === itemDateStr;
        const sameAmount = Math.abs(h.amount - item.amount) < 0.01;
        const sameDir = (h.direction || (h.type === 'income' ? 'credit' : 'debit')) === item.direction;
        return sameDate && sameAmount && sameDir;
      });

      if (dbFuzzyMatch) {
        isDup = true;
        reason = `Matched on identical date (${itemDateStr}), amount (₹${item.amount}), and direction (${item.direction}) in your ledger`;
        existingId = dbFuzzyMatch._id.toString();
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

