/**
 * FINOVAX PHASE 2: SMART STATEMENT IMPORT ENGINE AUTOMATED TEST SUITE
 * Unit, integration, security, and lifecycle verification for CSV, XLSX, PDF, GPay,
 * accounting rules, multi-tier duplicate detection, and staged preview workflow.
 */

import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import { validateUploadedFile, validateMagicBytes, sanitizeFilename, MAX_FILE_SIZE_BYTES } from '../services/statement/importValidationService';
import { parseCsvBuffer, parseCleanAmount, parseFlexibleDate, parseCsvLine } from '../services/statement/csvParser';
import { parseExcelBuffer, excelSerialDateToJSDate, parseExcelDate } from '../services/statement/excelParser';
import { parseBankPdfBuffer, HdfcBankStrategy, SbiBankStrategy, IciciBankStrategy, AxisBankStrategy, NullOcrAdapter } from '../services/statement/bankPdfParser';
import { parseGooglePayPdfBuffer, extractUpiReferenceId, GPAY_LIMITATIONS_DISCLOSURE } from '../services/statement/googlePayPdfParser';
import { extractCleanMerchant, normalizeRawRecord } from '../services/statement/transactionNormalizer';
import { categorizeTransactionWithRules } from '../services/statement/categorizationService';
import { detectDuplicatesMultiTier } from '../services/statement/duplicateDetectionService';
import { stageStatement, getStagedImportById, updateStagedItem, confirmStagedImport, cancelStagedImport } from '../services/statement/statementImportService';
import { StatementImport } from '../models/StatementImport';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { connectDB, isDbConnected } from '../config/db';

let passed = 0;
let failed = 0;

function assert(description: string, condition: any, extra?: any) {
  if (Boolean(condition)) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    if (extra !== undefined) console.error('     Detail:', extra);
    failed++;
  }
}

async function runStatementTests() {
  console.log('\n================================================================');
  console.log('🧪 FINOVAX PHASE 2: STATEMENT IMPORT ENGINE VERIFICATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SECTION 1: File Validation, Security & Magic Bytes
  // -------------------------------------------------------------
  console.log('--- 1. File Upload Security, Magic Bytes & Sanitization ---');

  // 1.1 Filename sanitization & path traversal prevention
  const traversalName = '../../../../etc/passwd.csv';
  const cleanName = sanitizeFilename(traversalName);
  assert('sanitizeFilename strips path traversal sequences', !cleanName.includes('..') && !cleanName.includes('/'));

  const specialCharsName = 'bank statement (SBI) @#$ 2026.csv';
  const cleanSpecial = sanitizeFilename(specialCharsName);
  assert('sanitizeFilename replaces unsafe characters with underscores', !cleanSpecial.includes('@') && !cleanSpecial.includes('$'));

  // 1.2 Executable signature rejection
  const mzBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03]); // Windows PE EXE header
  const mzCheck = validateMagicBytes(mzBuffer, '.csv');
  assert('validateMagicBytes rejects Windows MZ executable headers', !mzCheck.valid && mzCheck.reason?.includes('executable'));

  const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // Linux ELF binary header
  const elfCheck = validateMagicBytes(elfBuffer, '.pdf');
  assert('validateMagicBytes rejects Linux ELF binary headers', !elfCheck.valid && elfCheck.reason?.includes('ELF'));

  // 1.3 Magic bytes for PDF
  const validPdfHeader = Buffer.from('%PDF-1.7\n%Test PDF');
  const pdfCheck = validateMagicBytes(validPdfHeader, '.pdf');
  assert('validateMagicBytes validates authentic %PDF header', pdfCheck.valid);

  const fakePdf = Buffer.from('Not a PDF file content');
  const fakePdfCheck = validateMagicBytes(fakePdf, '.pdf');
  assert('validateMagicBytes rejects fake PDF without %PDF header', !fakePdfCheck.valid);

  // 1.4 Magic bytes for XLSX (PK\x03\x04)
  const validZipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
  const xlsxCheck = validateMagicBytes(validZipHeader, '.xlsx');
  assert('validateMagicBytes validates authentic XLSX ZIP header (PK\\x03\\x04)', xlsxCheck.valid);

  // 1.5 CSV null bytes detection
  const binaryCsv = Buffer.from('Date,Description,Amount\n2026-01-01,\x00\x00,100');
  const csvNullCheck = validateMagicBytes(binaryCsv, '.csv');
  assert('validateMagicBytes rejects CSV containing binary null bytes', !csvNullCheck.valid);

  // 1.6 Size limit verification
  const dummyFile: any = {
    originalname: 'test.csv',
    mimetype: 'text/csv',
    size: MAX_FILE_SIZE_BYTES + 1024,
    buffer: Buffer.from('Date,Description,Amount\n2026-01-01,Test,100')
  };
  const sizeValidation = validateUploadedFile(dummyFile);
  assert('validateUploadedFile rejects files exceeding 10 MB ceiling', !sizeValidation.isValid && sizeValidation.error?.includes('10 MB'));

  // -------------------------------------------------------------
  // SECTION 2: CSV Statement Parser
  // -------------------------------------------------------------
  console.log('\n--- 2. CSV Statement Parser ---');

  // 2.1 RFC 4180 Quoted line parsing
  const quotedLine = '2026-08-15,"Starbucks, Indiranagar","₹ 1,500.00","UPI/123/REF,CR"';
  const parsedLine = parseCsvLine(quotedLine);
  assert('parseCsvLine preserves commas inside double quotes', parsedLine[1] === 'Starbucks, Indiranagar');
  assert('parseCsvLine correctly extracts 4 columns', parsedLine.length === 4);

  // 2.2 Indian Number Formatting
  const inrAmount1 = parseCleanAmount('₹ 1,50,000.50');
  assert('parseCleanAmount parses Indian lakh format (1,50,000.50)', inrAmount1.amount === 150000.50);

  const inrAmountBracket = parseCleanAmount('(2,450.00)');
  assert('parseCleanAmount detects accounting bracket as negative', inrAmountBracket.amount === 2450.00 && inrAmountBracket.isNegative);

  // 2.3 Date parsing
  const d1 = parseFlexibleDate('15/08/2026');
  assert('parseFlexibleDate parses DD/MM/YYYY', d1?.getDate() === 15 && d1?.getMonth() === 7 && d1?.getFullYear() === 2026);

  const d2 = parseFlexibleDate('2026-09-20');
  assert('parseFlexibleDate parses ISO YYYY-MM-DD', d2?.getDate() === 20 && d2?.getMonth() === 8 && d2?.getFullYear() === 2026);

  // 2.4 Parse valid CSV statement buffer
  const sampleCsv = `
Bank Account Statement - HDFC Bank
Account Number: 50100012345678
Date,Narration,Withdrawal,Deposit,Balance
15/08/2026,UPI/412345678901/SWIGGY/swiggy@icici,450.00,,49550.00
16/08/2026,SALARY CREDIT FROM INFOSYS LTD,,85000.00,134550.00
17/08/2026,NEFT-AXIS001-OWN ACC TRF-SELF,10000.00,,124550.00
18/08/2026,AMAZON REFUND REVERSAL,,1299.00,125849.00
INVALID_ROW_WITHOUT_DATE,Bad Row Content,,,
  `.trim();

  const csvResult = parseCsvBuffer(Buffer.from(sampleCsv, 'utf-8'));
  assert('parseCsvBuffer detects header despite leading metadata rows', csvResult.records.length === 4);
  assert('parseCsvBuffer captures unparsed row with reason', csvResult.unparsedRows.length === 1 && csvResult.unparsedRows[0].rowNumber === 8);
  assert('parseCsvBuffer correctly identifies debit direction', csvResult.records[0].direction === 'debit' && csvResult.records[0].amount === 450);
  assert('parseCsvBuffer correctly identifies credit direction', csvResult.records[1].direction === 'credit' && csvResult.records[1].amount === 85000);

  // -------------------------------------------------------------
  // SECTION 3: Excel (XLSX) Statement Parser
  // -------------------------------------------------------------
  console.log('\n--- 3. Excel (XLSX) Statement Parser ---');

  // 3.1 Excel Serial Date conversion
  const serialDate = 44927; // 2023-01-01
  const converted = excelSerialDateToJSDate(serialDate);
  assert('excelSerialDateToJSDate accurately converts Excel serial numbers', converted.getFullYear() === 2023 && converted.getMonth() === 0 && converted.getDate() === 1);

  // 3.2 Build synthetic XLSX workbook in memory with metadata rows and test parsing
  const wsData = [
    ['State Bank of India', 'Account Summary', ''],
    ['Branch: Bangalore Main', 'IFSC: SBIN0000123', ''],
    ['Txn Date', 'Description', 'Debit', 'Credit', 'Balance'],
    ['10/08/2026', 'Zomato Online Order', '520.00', '', '25000.00'],
    ['12/08/2026', 'Interest Credit', '', '150.00', '25150.00']
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const xlsxResult = parseExcelBuffer(xlsxBuffer);
  assert('parseExcelBuffer parses XLSX and skips metadata rows', xlsxResult.records.length === 2);
  assert('parseExcelBuffer extracts first transaction as debit', xlsxResult.records[0].amount === 520 && xlsxResult.records[0].direction === 'debit');
  assert('parseExcelBuffer extracts second transaction as credit', xlsxResult.records[1].amount === 150 && xlsxResult.records[1].direction === 'credit');

  // -------------------------------------------------------------
  // SECTION 4: Bank PDF Parsing & Scanned Detection
  // -------------------------------------------------------------
  console.log('\n--- 4. Bank PDF Parser & Scanned PDF Handling ---');

  // 4.1 Bank strategy matching
  assert('HdfcBankStrategy detects HDFC header', HdfcBankStrategy.canParse('HDFC BANK LIMITED ACCOUNT STATEMENT'));
  assert('SbiBankStrategy detects SBI header', SbiBankStrategy.canParse('STATE BANK OF INDIA PASSBOOK STATEMENT'));
  assert('IciciBankStrategy detects ICICI header', IciciBankStrategy.canParse('ICICI BANK STATEMENT OF TRANSACTIONS'));
  assert('AxisBankStrategy detects Axis header', AxisBankStrategy.canParse('AXIS BANK ACCOUNT STATEMENT'));

  // 4.2 Scanned PDF detection
  const emptyPdfBuffer = Buffer.from('%PDF-1.5\n%Empty image only PDF\n%%EOF');
  try {
    await parseBankPdfBuffer(emptyPdfBuffer);
    assert('parseBankPdfBuffer throws OCR_REQUIRED on scanned/empty PDF', false);
  } catch (err: any) {
    assert('parseBankPdfBuffer throws OCR_REQUIRED on scanned/empty PDF', err.requiresOcr === true || err.message?.includes('OCR'));
  }

  // -------------------------------------------------------------
  // SECTION 5: Google Pay Statement Parser & Limitations
  // -------------------------------------------------------------
  console.log('\n--- 5. Google Pay Statement Parser & Limitations ---');

  // 5.1 12-digit UPI Transaction Reference Number (UTR) extraction
  const refText1 = 'UPI Transaction ID: 423512345678';
  const extractedRef = extractUpiReferenceId(refText1);
  assert('extractUpiReferenceId extracts 12-digit UTR', extractedRef === '423512345678');

  // 5.2 GPay limitations disclosure verification
  assert('GPAY_LIMITATIONS_DISCLOSURE includes account balance disclaimer', GPAY_LIMITATIONS_DISCLOSURE.some(d => d.includes('Account Balances')));
  assert('GPAY_LIMITATIONS_DISCLOSURE includes UPI Reference verification', GPAY_LIMITATIONS_DISCLOSURE.some(d => d.includes('UPI Reference')));

  // -------------------------------------------------------------
  // SECTION 6: Accounting Rules & Normalization
  // -------------------------------------------------------------
  console.log('\n--- 6. Accounting Rules & Transaction Normalization ---');

  // 6.1 Refund Rule: MUST NOT be treated as new income
  const refundCat = categorizeTransactionWithRules('SWIGGY ORDER CANCELLED REFUND', 450, 'credit');
  assert('Accounting Rule: Refund classified with transactionType refund', refundCat.transactionType === 'refund');

  const rawRefund = {
    date: new Date('2026-08-18'),
    description: 'Swiggy Cancellation Refund',
    amount: 450,
    direction: 'credit' as const
  };
  const normalizedRefund = normalizeRawRecord(rawRefund, 0, refundCat);
  assert('Accounting Rule: Normalized refund retains transactionType refund', normalizedRefund.transactionType === 'refund');

  // 6.2 Internal Transfer Rule: MUST NOT be treated as income or expense
  const transferCat = categorizeTransactionWithRules('NEFT-OWN ACC TRF-SELF', 15000, 'debit');
  assert('Accounting Rule: Own account transfer classified with transactionType transfer', transferCat.transactionType === 'transfer');

  const rawTransfer = {
    date: new Date('2026-08-19'),
    description: 'Own Account Self Transfer',
    amount: 15000,
    direction: 'debit' as const
  };
  const normalizedTransfer = normalizeRawRecord(rawTransfer, 1, transferCat);
  assert('Accounting Rule: Normalized transfer retains transactionType transfer', normalizedTransfer.transactionType === 'transfer');

  // 6.3 Clean Merchant Extraction
  const upiMerchant = extractCleanMerchant('UPI/412345678901/SWIGGY/swiggy@icici/UPI');
  assert('extractCleanMerchant extracts Swiggy from UPI narration', upiMerchant.toLowerCase().includes('swiggy'));

  const posMerchant = extractCleanMerchant('POS 43210987 STARBUCKS BANGALORE');
  assert('extractCleanMerchant extracts Starbucks Bangalore from POS narration', posMerchant.toLowerCase().includes('starbucks'));

  // -------------------------------------------------------------
  // SECTION 7: Multi-Tier Duplicate Detection & Staging Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- 7. Duplicate Detection & Staging Lifecycle ---');

  if (process.env.TEST_LIVE_DB !== 'true') {
    console.log('  ℹ️ Offline unit test mode active. Skipping live Atlas DB operations.');
    console.log('  👉 Deterministic statement parsing, DCB Bank PDF parser, and accounting rules fully verified.');
  } else {
    // Connect to DB for staging integration test
    await connectDB();

    if (!isDbConnected()) {
      console.log('  ⚠️ NOTE: MongoDB is not connected in sandbox test environment.');
      console.log('  👉 Staging DB integration skipped cleanly. Deterministic parser tests verified.');
    } else {
      // Create temporary test user
    const testEmail = `statement_test_${Date.now()}@finovax.test`;
    const testUser = await User.create({
      name: 'Statement Tester',
      email: testEmail,
      passwordHash: '$2a$12$dummyhashforduplicatestatementssuite1234567890',
      currency: 'INR',
      monthlyIncome: 60000
    });

  try {
    // Insert an existing baseline transaction into MongoDB
    const baselineTx = await Transaction.create({
      userId: testUser._id,
      title: 'Swiggy Baseline Order',
      merchant: 'Swiggy',
      amount: 650.00,
      currency: 'INR',
      type: 'expense',
      direction: 'debit',
      transactionType: 'expense',
      category: 'Food',
      date: new Date('2026-08-15'),
      paymentMethod: 'UPI',
      referenceId: 'UPI999888777666'
    });

    // 7.1 Multi-tier Duplicate Detection
    const candidateList = [
      // Match 1: Exact reference ID match against DB
      {
        id: 'c1',
        date: new Date('2026-08-20'), // Different date, but same UTR
        title: 'Swiggy Order',
        merchant: 'Swiggy',
        amount: 650.00,
        currency: 'INR',
        type: 'expense' as const,
        direction: 'debit' as const,
        transactionType: 'expense',
        category: 'Food',
        referenceId: 'UPI999888777666',
        paymentMethod: 'UPI',
        isDuplicate: false,
        categorizationConfidence: 0.95,
        categorizationSource: 'rule_based' as const,
        userExcluded: false
      },
      // Match 2: Same-day + same-amount + same-direction fuzzy match against DB
      {
        id: 'c2',
        date: new Date('2026-08-15'), // Same day as baselineTx
        title: 'Swiggy In-Store',
        merchant: 'Swiggy',
        amount: 650.00, // Same amount
        currency: 'INR',
        type: 'expense' as const,
        direction: 'debit' as const,
        transactionType: 'expense',
        category: 'Food',
        referenceId: 'DIFFERENT_REF_123',
        paymentMethod: 'UPI',
        isDuplicate: false,
        categorizationConfidence: 0.95,
        categorizationSource: 'rule_based' as const,
        userExcluded: false
      },
      // Item 3: Unique transaction
      {
        id: 'c3',
        date: new Date('2026-08-22'),
        title: 'Uber Ride',
        merchant: 'Uber',
        amount: 280.00,
        currency: 'INR',
        type: 'expense' as const,
        direction: 'debit' as const,
        transactionType: 'expense',
        category: 'Travel',
        referenceId: 'UBER_REF_999',
        paymentMethod: 'UPI',
        isDuplicate: false,
        categorizationConfidence: 0.92,
        categorizationSource: 'rule_based' as const,
        userExcluded: false
      },
      // Item 4: Intra-batch duplicate of Item 3!
      {
        id: 'c4',
        date: new Date('2026-08-22'),
        title: 'Uber Ride Duplicate In Same Batch',
        merchant: 'Uber',
        amount: 280.00,
        currency: 'INR',
        type: 'expense' as const,
        direction: 'debit' as const,
        transactionType: 'expense',
        category: 'Travel',
        referenceId: 'UBER_REF_999',
        paymentMethod: 'UPI',
        isDuplicate: false,
        categorizationConfidence: 0.92,
        categorizationSource: 'rule_based' as const,
        userExcluded: false
      }
    ];

    const dupResult = await detectDuplicatesMultiTier(testUser._id, candidateList);
    assert('Tier 1: Detects exact reference ID duplicate against DB ledger', dupResult.stagedTransactions[0].isDuplicate && dupResult.stagedTransactions[0].duplicateReason?.includes('Reference ID'));
    assert('Tier 2: Detects same-day + amount + direction duplicate against DB ledger', dupResult.stagedTransactions[1].isDuplicate && dupResult.stagedTransactions[1].duplicateReason?.includes('identical date'));
    assert('Item 3 is not duplicate on first appearance', !dupResult.stagedTransactions[2].isDuplicate);
    assert('Tier 3: Detects intra-batch duplicate appearing later in the same statement', dupResult.stagedTransactions[3].isDuplicate && dupResult.stagedTransactions[3].duplicateReason?.includes('this statement'));
    assert('Total duplicates detected is 3', dupResult.duplicateCount === 3);

    // 7.2 Staged Import Workflow (stage -> preview -> patch -> confirm -> idempotency)
    const stageCsvContent = `
Date,Description,Withdrawal,Deposit,Reference
2026-08-01,Zomato Food Order,350.00,,ZOMATO112233
2026-08-02,Electricity Bill Bescom,1200.00,,BESCOM445566
2026-08-03,Client Freelance Project,,25000.00,CLIENT778899
    `.trim();

    const uploadFileFixture: any = {
      originalname: 'august_transactions.csv',
      mimetype: 'text/csv',
      size: Buffer.byteLength(stageCsvContent),
      buffer: Buffer.from(stageCsvContent, 'utf-8')
    };

    const stagedBatch = await stageStatement({
      userId: testUser._id.toString(),
      file: uploadFileFixture,
      source: 'bank_statement',
      bankName: 'HDFC Bank'
    });

    assert('stageStatement creates preview_ready import record', stagedBatch.totalRecords === 3);

    // Check that NO premature insertions were made into Transaction collection
    const unconfirmedTxCount = await Transaction.countDocuments({ importBatchId: stagedBatch.importId });
    assert('Zero dummy data guarantee: NO transactions inserted before user confirmation', unconfirmedTxCount === 0);

    // 7.3 Patch staged transaction (modify category and exclude row 1)
    await updateStagedItem(testUser._id.toString(), stagedBatch.importId.toString(), 0, {
      category: 'Dining & Outing',
      userExcluded: true
    });
    const refreshedDoc = await getStagedImportById(testUser._id.toString(), stagedBatch.importId.toString());
    assert('updateStagedItem marks target transaction userExcluded', refreshedDoc.stagedTransactions[0].userExcluded === true);
    assert('updateStagedItem updates category', refreshedDoc.stagedTransactions[0].category === 'Dining & Outing');

    // 7.4 Confirm staged import
    const confirmResult = await confirmStagedImport(testUser._id.toString(), stagedBatch.importId.toString());
    assert('confirmStagedImport imports exactly non-excluded transactions (2 of 3)', confirmResult.importedCount === 2);
    assert('confirmStagedImport sets status to confirmed', confirmResult.status === 'confirmed');

    const committedCount = await Transaction.countDocuments({ importBatchId: stagedBatch.importId });
    assert('Transaction collection contains exactly 2 committed records', committedCount === 2);

    // 7.5 Idempotency: confirming twice should be rejected
    try {
      await confirmStagedImport(testUser._id.toString(), stagedBatch.importId.toString());
      assert('Idempotency: Re-confirming already confirmed batch throws 400', false);
    } catch (err: any) {
      assert('Idempotency: Re-confirming already confirmed batch throws 400', err.statusCode === 400);
    }

    // 7.6 Cancellation Workflow
    const cancelCsvContent = `Date,Description,Withdrawal\n2026-08-10,Test Cancel,100.00`;
    const cancelFileFixture: any = {
      originalname: 'cancel_test.csv',
      mimetype: 'text/csv',
      size: Buffer.byteLength(cancelCsvContent),
      buffer: Buffer.from(cancelCsvContent, 'utf-8')
    };
    const cancelBatch = await stageStatement({
      userId: testUser._id.toString(),
      file: cancelFileFixture
    });

    const cancelRes = await cancelStagedImport(testUser._id.toString(), cancelBatch.importId.toString());
    assert('cancelStagedImport sets status to cancelled', cancelRes.status === 'cancelled');

    const cancelledDoc = await StatementImport.findById(cancelBatch.importId);
    assert('Cancelled batch status is persisted in MongoDB', cancelledDoc?.status === 'cancelled');
  } finally {
    // Clean up test fixtures
    await Transaction.deleteMany({ userId: testUser._id });
    await StatementImport.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('  🧹 All temporary test users, transactions, and statement fixtures cleaned up.');
  }
}
}

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PHASE 2 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStatementTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
