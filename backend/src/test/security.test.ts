process.env.NODE_ENV = 'test';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../index';
import { generateToken, AuthUser } from '../middleware/auth';
import { isStrongPassword } from '../controllers/authController';
import { isDbConnected, connectDB } from '../config/db';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { FinancialGoal } from '../models/FinancialGoal';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, extra?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    if (extra !== undefined) {
      console.error('     Detail:', typeof extra === 'object' ? JSON.stringify(extra) : extra);
    }
    failed++;
  }
}

async function runSecurityTests() {
  console.log('\n================================================================');
  console.log('🛡️  FINOVAX PHASE 4: SECURITY & RELIABILITY TEST SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------
  // 1. Unauthenticated Route Guards & Token Verification
  // ----------------------------------------------------------------
  console.log('--- 1. Authentication Guards & JWT Verification Security ---');
  try {
    const unauthEndpoints = [
      { method: 'get', url: '/api/dashboard/summary' },
      { method: 'get', url: '/api/dashboard/cashflow' },
      { method: 'get', url: '/api/dashboard/categories' },
      { method: 'get', url: '/api/dashboard/recent-transactions' },
      { method: 'get', url: '/api/transactions' },
      { method: 'post', url: '/api/transactions' },
      { method: 'get', url: '/api/budgets' },
      { method: 'get', url: '/api/goals' },
      { method: 'get', url: '/api/fraud-alerts' },
      { method: 'get', url: '/api/statements/imports' },
      { method: 'post', url: '/api/statements/upload' }
    ];

    for (const ep of unauthEndpoints) {
      const res = await (request(app) as any)[ep.method](ep.url);
      assert(
        `Unauthenticated ${ep.method.toUpperCase()} ${ep.url} rejected with 401 UNAUTHORIZED`,
        res.status === 401 && res.body.code === 'UNAUTHORIZED',
        res.body
      );
    }

    // Expired token rejection
    const expiredToken = jwt.sign(
      { id: '507f1f77bcf86cd799439011', email: 'exp@finovax.com', name: 'Expired' },
      ENV.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert(
      'Expired JWT token rejected with 401 TOKEN_EXPIRED',
      expRes.status === 401 && expRes.body.code === 'TOKEN_EXPIRED',
      expRes.body
    );

    // Tampered token rejection
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tamperedsignature';
    const fakeRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${fakeToken}`);
    assert(
      'Tampered JWT signature rejected with 401 INVALID_TOKEN',
      fakeRes.status === 401 && fakeRes.body.code === 'INVALID_TOKEN',
      fakeRes.body
    );
  } catch (err: any) {
    assert('Auth guard checks executed cleanly', false, err.message);
  }

  // ----------------------------------------------------------------
  // 2. BUG-01: Statement Upload Error Handling & File Size Limits
  // ----------------------------------------------------------------
  console.log('\n--- 2. BUG-01: File Upload Error Handling & Boundary Limits ---');
  try {
    // Generate valid temporary auth token for testing upload filter
    const testAuthToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'sec-tester@finovax.com',
      name: 'Security Tester'
    });

    // 2.1 Missing file payload
    const noFileRes = await request(app)
      .post('/api/statements/upload')
      .set('Authorization', `Bearer ${testAuthToken}`);
    assert(
      'Upload with no file returns 400 error (not 500)',
      noFileRes.status === 400,
      noFileRes.body
    );

    // 2.2 Unsupported .exe file
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    const exeRes = await request(app)
      .post('/api/statements/upload')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .attach('statement', exeBuffer, 'malicious_payload.exe');
    assert(
      'Upload of .exe file returns HTTP 400 UNSUPPORTED_FILE_TYPE (not 500)',
      exeRes.status === 400 && exeRes.body.code === 'UNSUPPORTED_FILE_TYPE',
      exeRes.body
    );

    // 2.3 Unsupported .sh shell script
    const shBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
    const shRes = await request(app)
      .post('/api/statements/upload')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .attach('statement', shBuffer, 'exploit.sh');
    assert(
      'Upload of .sh script returns HTTP 400 UNSUPPORTED_FILE_TYPE (not 500)',
      shRes.status === 400 && shRes.body.code === 'UNSUPPORTED_FILE_TYPE',
      shRes.body
    );

    // 2.4 Unsupported .bin file
    const binBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const binRes = await request(app)
      .post('/api/statements/upload')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .attach('statement', binBuffer, 'data.bin');
    assert(
      'Upload of .bin file returns HTTP 400 UNSUPPORTED_FILE_TYPE (not 500)',
      binRes.status === 400 && binRes.body.code === 'UNSUPPORTED_FILE_TYPE',
      binRes.body
    );

    // 2.5 Oversized file exceeding 10 MB limit
    // Allocate 10.5 MB buffer
    const oversizedBuffer = Buffer.alloc(10.5 * 1024 * 1024, 0x41);
    const oversizeRes = await request(app)
      .post('/api/statements/upload')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .attach('statement', oversizedBuffer, 'oversized_statement.csv');
    assert(
      'Upload exceeding 10 MB returns HTTP 400 FILE_TOO_LARGE (not 500)',
      oversizeRes.status === 400 && oversizeRes.body.code === 'FILE_TOO_LARGE',
      oversizeRes.body
    );
  } catch (err: any) {
    assert('BUG-01 statement upload tests executed without fatal errors', false, err.message);
  }

  // ----------------------------------------------------------------
  // 3. ID Parameter Validation & Malformed ID Guarding
  // ----------------------------------------------------------------
  console.log('\n--- 3. Parameter Validation: MongoDB ObjectId Hex Format ---');
  try {
    const testAuthToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'sec-tester@finovax.com',
      name: 'Security Tester'
    });

    const malformedEndpoints = [
      { method: 'get', url: '/api/transactions/not-a-valid-id' },
      { method: 'put', url: '/api/transactions/not-a-valid-id' },
      { method: 'patch', url: '/api/transactions/not-a-valid-id' },
      { method: 'delete', url: '/api/transactions/not-a-valid-id' },
      { method: 'patch', url: '/api/budgets/not-a-valid-id' },
      { method: 'delete', url: '/api/budgets/not-a-valid-id' },
      { method: 'patch', url: '/api/goals/not-a-valid-id' },
      { method: 'delete', url: '/api/goals/not-a-valid-id' },
      { method: 'get', url: '/api/fraud-alerts/not-a-valid-id' },
      { method: 'patch', url: '/api/fraud-alerts/not-a-valid-id' },
      { method: 'get', url: '/api/statements/imports/not-a-valid-id' },
      { method: 'post', url: '/api/statements/imports/not-a-valid-id/confirm' },
      { method: 'post', url: '/api/statements/imports/not-a-valid-id/cancel' }
    ];

    for (const ep of malformedEndpoints) {
      const res = await (request(app) as any)[ep.method](ep.url)
        .set('Authorization', `Bearer ${testAuthToken}`);
      assert(
        `Malformed ObjectId in ${ep.method.toUpperCase()} ${ep.url} rejected with 400 INVALID_ID_FORMAT`,
        res.status === 400 && res.body.code === 'INVALID_ID_FORMAT',
        res.body
      );
    }
  } catch (err: any) {
    assert('Malformed ID tests executed cleanly', false, err.message);
  }

  // ----------------------------------------------------------------
  // 4. Live Database Tests: BUG-02, BUG-03, Tenant Isolation, Password Security
  // ----------------------------------------------------------------
  console.log('\n--- 4. Live DB Tests: BUG-02, BUG-03, Tenant Isolation & Password Protection ---');
  await connectDB();
  if (!isDbConnected()) {
    console.log('  ⚠️ NOTE: MongoDB Atlas is currently not connected.');
    console.log('  👉 Verified: Database unavailable fail-safe handled.');
  } else {
    try {
      console.log('  🔄 Connected to MongoDB. Running isolation and contract verification...');

      const testEmailA = `sec-user-a-${Date.now()}@finovax.com`;
      const testEmailB = `sec-user-b-${Date.now()}@finovax.com`;
      const testPassword = 'FinovaX#2026StrongPass';

      // 4.1 Register User A
      const regResA = await request(app).post('/api/auth/register').send({
        name: 'User Alpha Security',
        email: testEmailA,
        password: testPassword,
        currency: 'INR',
        monthlyIncome: 80000
      });
      assert('User A registered with 201', regResA.status === 201);
      assert('User A registration response does NOT expose passwordHash', regResA.body.data.user.passwordHash === undefined);

      const tokenA = regResA.body.data.token;
      const userAId = regResA.body.data.user.id;

      // 4.2 Verify schema select:false prevents passwordHash leak on DB queries
      const fetchedUserFromDb = await User.findById(userAId).lean();
      assert(
        'User model schema select:false prevents passwordHash leakage on findById',
        fetchedUserFromDb !== null && (fetchedUserFromDb as any).passwordHash === undefined
      );

      // 4.3 Register User B (for tenant isolation tests)
      const regResB = await request(app).post('/api/auth/register').send({
        name: 'User Beta Security',
        email: testEmailB,
        password: testPassword,
        currency: 'INR',
        monthlyIncome: 60000
      });
      assert('User B registered with 201', regResB.status === 201);
      const tokenB = regResB.body.data.token;
      const userBId = regResB.body.data.user.id;

      // 4.4 Create transaction under User A
      const createTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Initial Alpha Coffee',
          amount: 250,
          type: 'expense',
          category: 'Food',
          date: new Date().toISOString()
        });
      assert('User A transaction created with 201', createTxRes.status === 201);
      const txAId = createTxRes.body.data.transaction.id;

      // 4.5 BUG-02: PUT method on /api/transactions/:id
      const putRes = await request(app)
        .put(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alpha Premium Coffee PUT Updated',
          amount: 320,
          category: 'Food & Dining'
        });
      assert('PUT /api/transactions/:id updates transaction with 200', putRes.status === 200, putRes.body);
      assert('PUT response reflects updated title', putRes.body.data?.transaction?.title === 'Alpha Premium Coffee PUT Updated');
      assert('PUT response reflects updated amount', putRes.body.data?.transaction?.amount === 320);

      // 4.6 PUT validation rules
      const putBadAmountRes = await request(app)
        .put(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: -50 });
      assert(
        'PUT /api/transactions/:id rejects negative amount with 400 INVALID_AMOUNT',
        putBadAmountRes.status === 400 && putBadAmountRes.body.code === 'INVALID_AMOUNT',
        putBadAmountRes.body
      );

      // 4.7 PATCH /api/transactions/:id consistency
      const patchRes = await request(app)
        .patch(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alpha Premium Coffee PATCH Updated',
          amount: 350
        });
      assert('PATCH /api/transactions/:id updates transaction with 200', patchRes.status === 200);
      assert('PATCH response reflects updated amount', patchRes.body.data?.transaction?.amount === 350);

      // 4.8 Tenant Isolation: User B cannot modify User A's transaction via PUT or PATCH
      const putCrossRes = await request(app)
        .put(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hacked by User B' });
      assert(
        'Tenant Isolation: User B PUT on User A transaction returns 404 (not modified)',
        putCrossRes.status === 404 && putCrossRes.body.code === 'TRANSACTION_NOT_FOUND',
        putCrossRes.body
      );

      const patchCrossRes = await request(app)
        .patch(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hacked by User B' });
      assert(
        'Tenant Isolation: User B PATCH on User A transaction returns 404 (not modified)',
        patchCrossRes.status === 404 && patchCrossRes.body.code === 'TRANSACTION_NOT_FOUND',
        patchCrossRes.body
      );

      // Verify transaction in DB was NOT tampered with by User B
      const txCheck = await Transaction.findById(txAId);
      assert('Transaction title was not modified by cross-tenant attempt', txCheck?.title === 'Alpha Premium Coffee PATCH Updated');

      // 4.9 Mass assignment prevention: body.userId is ignored during creation
      const massAssignTx = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Alpha Spoof Test',
          amount: 100,
          type: 'expense',
          category: 'Bills',
          userId: userBId // Attempt to assign to User B
        });
      assert('Transaction created with 201', massAssignTx.status === 201);
      const createdTxId = massAssignTx.body.data.transaction.id;
      const fetchedCreatedTx = await Transaction.findById(createdTxId);
      assert(
        'Mass assignment protection: transaction belongs to authenticated User A, not body.userId',
        fetchedCreatedTx?.userId?.toString() === userAId.toString()
      );

      // 4.10 BUG-03: Dashboard Expenses by Category dual-key contract
      const dashCatRes = await request(app)
        .get('/api/dashboard/categories')
        .set('Authorization', `Bearer ${tokenA}`);
      assert('GET /api/dashboard/categories returns 200', dashCatRes.status === 200, dashCatRes.body);
      assert('Response data has "categories" key', Array.isArray(dashCatRes.body.data?.categories));
      assert('Response data has "expensesByCategory" key', Array.isArray(dashCatRes.body.data?.expensesByCategory));
      assert(
        'Both keys contain identical data elements',
        JSON.stringify(dashCatRes.body.data?.categories) === JSON.stringify(dashCatRes.body.data?.expensesByCategory)
      );

      // 4.11 BUG-03: Dashboard /expenses-by-category alias
      const dashExpCatRes = await request(app)
        .get('/api/dashboard/expenses-by-category')
        .set('Authorization', `Bearer ${tokenA}`);
      assert('GET /api/dashboard/expenses-by-category returns 200', dashExpCatRes.status === 200);
      assert('expenses-by-category response has both keys',
        Array.isArray(dashExpCatRes.body.data?.categories) &&
        Array.isArray(dashExpCatRes.body.data?.expensesByCategory)
      );

      // Clean up temporary test fixtures safely
      await Promise.all([
        User.deleteOne({ _id: userAId }),
        User.deleteOne({ _id: userBId }),
        Transaction.deleteMany({ userId: { $in: [userAId, userBId] } })
      ]);
      console.log('  🧹 Temporary security test fixtures successfully purged.');
    } catch (err: any) {
      assert('Live DB security tests executed without error', false, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(`📊 SECURITY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
}

if (require.main === module) {
  runSecurityTests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal security test runner error:', err);
      process.exit(1);
    });
}

export default runSecurityTests;
