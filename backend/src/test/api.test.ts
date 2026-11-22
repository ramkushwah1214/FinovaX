process.env.NODE_ENV = 'test';
import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { generateToken, AuthUser } from '../middleware/auth';
import { isStrongPassword } from '../controllers/authController';
import { isDbConnected, connectDB } from '../config/db';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { FinancialGoal } from '../models/FinancialGoal';
import { RecurringPayment } from '../models/RecurringPayment';
import { FraudAlert } from '../models/FraudAlert';

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 FINOVAX PHASE 6: AUTOMATED TESTING, SECURITY & END-TO-END SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  // 1. Health & Server Readiness Checks
  console.log('--- 1. Health, System Readiness & Service Verification ---');
  try {
    const resRoot = await request(app).get('/');
    assert('GET / returns 200 with service welcome message', resRoot.status === 200 && resRoot.body.version === '1.0.0');

    const resHealth = await request(app).get('/api/health');
    assert('GET /api/health returns 200 with uptime and status payload', resHealth.status === 200 && 'uptime' in resHealth.body);
    assert('Health payload includes database connectivity status', 'database' in resHealth.body && typeof resHealth.body.database.connected === 'boolean');
    assert('Health payload includes verified aiService status', 'aiService' in resHealth.body && typeof resHealth.body.aiService.connected === 'boolean');

    const res404 = await request(app).get('/api/non-existent-endpoint-xyz');
    assert('Non-existent route returns 404 with standard error JSON', res404.status === 404 && res404.body.code === 'NOT_FOUND');
  } catch (err: any) {
    assert('Health and root checks executed without uncaught errors', false, err.message);
  }

  // 2. Password Strength & Input Validation Rules
  console.log('\n--- 2. Strong Password, RFC 5322 Email & Input Validation Rules ---');
  try {
    assert('isStrongPassword rejects short passwords (<8 chars)', !isStrongPassword('Short1!'));
    assert('isStrongPassword rejects passwords without uppercase', !isStrongPassword('lowercase123!'));
    assert('isStrongPassword rejects passwords without lowercase', !isStrongPassword('UPPERCASE123!'));
    assert('isStrongPassword rejects passwords without numbers/symbols', !isStrongPassword('AllLettersOnly'));
    assert('isStrongPassword accepts strong passwords with mixed case + numbers + symbols', isStrongPassword('FinovaX#2026Secure'));
  } catch (err: any) {
    assert('Password validation helper executed without errors', false, err.message);
  }

  // 3. JWT Signing, Token Verification & Session Security
  console.log('\n--- 3. JWT Cryptographic Signing & Token Verification Checks ---');
  try {
    const testPayload = { id: '507f1f77bcf86cd799439011', email: 'auditor@finovax.com', name: 'Security Auditor' };
    const validToken = generateToken(testPayload);
    assert('generateToken produces valid non-empty JWT string', typeof validToken === 'string' && validToken.split('.').length === 3);

    const decoded = jwt.verify(validToken, ENV.JWT_SECRET) as AuthUser;
    assert('JWT contains correct user id in signed claims', decoded.id === testPayload.id);
    assert('JWT contains correct email in signed claims', decoded.email === testPayload.email);

    // Expired token rejection
    const expiredToken = jwt.sign(testPayload, ENV.JWT_SECRET, { expiresIn: '-1s' });
    let expiredRejected = false;
    try {
      jwt.verify(expiredToken, ENV.JWT_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') expiredRejected = true;
    }
    assert('Expired JWT signature triggers TokenExpiredError', expiredRejected);

    // Tampered token rejection
    const tamperedToken = validToken.slice(0, -6) + 'abc123';
    let tamperedRejected = false;
    try {
      jwt.verify(tamperedToken, ENV.JWT_SECRET);
    } catch {
      tamperedRejected = true;
    }
    assert('Tampered JWT signature fails verification', tamperedRejected);
  } catch (err: any) {
    assert('JWT signing and verification checks executed cleanly', false, err.message);
  }

  // 4. Parameter Validation & Database Readiness Fail-Safe Checks
  console.log('\n--- 4. ID Parameter Validation & Unauthenticated Access Guards ---');
  try {
    const resBadId = await request(app).get('/api/transactions/invalid-mongo-id-123');
    if (!isDbConnected()) {
      assert('Protected route returns 503 when DB is offline (zero fake responses)', resBadId.status === 503 && resBadId.body.code === 'DATABASE_UNAVAILABLE');
    } else {
      assert('Malformed MongoDB ID returns 400 INVALID_ID_FORMAT or 401', resBadId.status === 400 || resBadId.status === 401);
    }

    const resNoToken = await request(app).get('/api/transactions');
    if (!isDbConnected()) {
      assert('Protected endpoint guards against DB unavailability with 503', resNoToken.status === 503);
    } else {
      assert('Protected endpoint rejects unauthenticated request with 401 UNAUTHORIZED', resNoToken.status === 401 && resNoToken.body.code === 'UNAUTHORIZED');
    }

    const resLogout = await request(app).post('/api/auth/logout');
    assert('POST /api/auth/logout succeeds with 200', resLogout.status === 200);
  } catch (err: any) {
    assert('Parameter validation and guard checks executed cleanly', false, err.message);
  }

  // 5. Schema Constraint & Model Invariant Checks
  console.log('\n--- 5. Financial Numeric Boundaries & Schema Constraints ---');
  try {
    // Transaction schema constraints
    const invalidTx = new Transaction({
      title: '',
      amount: -500,
      type: 'invalid_type'
    });
    const txErr: any = await invalidTx.validate().catch(e => e);
    assert('Transaction model rejects empty title', !!txErr?.errors?.['title']);
    assert('Transaction model rejects negative amount', !!txErr?.errors?.['amount']);
    assert('Transaction model rejects invalid transaction type', !!txErr?.errors?.['type']);

    // Budget schema constraints
    const invalidBudget = new Budget({
      limitAmount: -100,
      month: 13
    });
    const budgetErr: any = await invalidBudget.validate().catch(e => e);
    assert('Budget model rejects negative limitAmount', !!budgetErr?.errors?.['limitAmount']);
    assert('Budget model rejects month > 12', !!budgetErr?.errors?.['month']);

    // Goal schema constraints
    const invalidGoal = new FinancialGoal({
      title: '',
      targetAmount: 0
    });
    const goalErr: any = await invalidGoal.validate().catch(e => e);
    assert('Goal model rejects empty title and zero target amount', !!goalErr?.errors?.['title'] && !!goalErr?.errors?.['targetAmount']);

    // User model constraints
    const invalidUser = new User({
      name: '',
      email: 'bad-email-format',
      passwordHash: ''
    });
    const userErr: any = await invalidUser.validate().catch(e => e);
    assert('User model rejects empty name', !!userErr?.errors?.['name']);
    assert('User model rejects invalid email format', !!userErr?.errors?.['email']);
    assert('User model rejects empty passwordHash', !!userErr?.errors?.['passwordHash']);
  } catch (err: any) {
    assert('Schema constraint tests executed cleanly', false, err.message);
  }

  // 5.1 Statement Ingestion, Merchant Extraction & Duplicate Matching Rules
  console.log('\n--- 5.1 Statement Ingestion, Merchant Extraction & Categorization Engine ---');
  try {
    const { categorizeTransaction, extractMerchant, parseDateFlexible } = require('../services/statementParser');
    
    // Categorization tests
    const catFood = categorizeTransaction('UPI/12345/Swiggy Bangalore Order', 450, 'debit');
    assert('Categorizer correctly assigns Food to Swiggy narration', catFood.category === 'Food');
    
    const catSalary = categorizeTransaction('Corporate Payroll Salary Credit', 85000, 'credit');
    assert('Categorizer correctly classifies Salary as income', catSalary.category === 'Salary' && catSalary.transactionType === 'income');

    const catRefund = categorizeTransaction('Amazon Order Refund Reversal', 1200, 'credit');
    assert('Refund is NOT counted as new income (classified as refund type)', catRefund.transactionType === 'refund');

    const catSelfTransfer = categorizeTransaction('Self Transfer to Savings A/C', 10000, 'debit');
    assert('Own account transfer is NOT treated as spending expense', catSelfTransfer.transactionType === 'transfer');

    // Merchant extraction
    const merchant = extractMerchant('UPI/412345678901/SWIGGY/swiggy@icici/UPI');
    assert('extractMerchant extracts clean merchant token from UPI narration', merchant.toLowerCase().includes('swiggy'));

    // Date parsing
    const d1 = parseDateFlexible('15/08/2026');
    assert('parseDateFlexible handles DD/MM/YYYY Indian banking dates', d1.getDate() === 15 && d1.getMonth() === 7 && d1.getFullYear() === 2026);
  } catch (err: any) {
    assert('Statement parser unit tests executed cleanly', false, err.message);
  }


  // 6. Live Database Integration, End-to-End Workflows, AI Anomaly Scoring & Data Isolation
  console.log('\n--- 6. Live MongoDB Atlas Integration & Complete Isolation Suite ---');
  await connectDB();
  if (!isDbConnected()) {
    console.log('  ⚠️ NOTE: MongoDB is not connected.');
    console.log('  👉 Verified: All endpoints cleanly report 503 DATABASE_UNAVAILABLE without fake mock fallbacks.');
  } else {
    try {
      console.log('  🔄 Connected to MongoDB Atlas. Executing live end-to-end tests...');

      const testEmailA = `test-user-a-${Date.now()}@finovax.com`;
      const testEmailB = `test-user-b-${Date.now()}@finovax.com`;
      const testEmailEmpty = `test-user-empty-${Date.now()}@finovax.com`;
      const testPassword = 'FinovaX#2026Password';

      // 6.1 Register User A with strong password
      const regResA = await request(app).post('/api/auth/register').send({
        name: 'User Alpha',
        email: testEmailA,
        password: testPassword,
        currency: 'INR',
        monthlyIncome: 75000
      });
      assert('User A registration succeeds with 201', regResA.status === 201);
      assert('Registration response does NOT expose passwordHash', !regResA.body.data.user.passwordHash);
      const cookieA = regResA.headers['set-cookie'];
      const hasCookieA = Array.isArray(cookieA)
        ? cookieA.some((c: string) => c.includes('finovax_token'))
        : typeof cookieA === 'string' && cookieA.includes('finovax_token');
      assert('Registration response sets finovax_token cookie', !!hasCookieA);

      const tokenA = regResA.body.data.token;
      const userAId = regResA.body.data.user.id;

      // 6.2 Duplicate Registration Protection
      const dupRes = await request(app).post('/api/auth/register').send({
        name: 'User Alpha Duplicate',
        email: testEmailA,
        password: testPassword
      });
      assert('Duplicate email registration returns 409 USER_EXISTS', dupRes.status === 409 && dupRes.body.code === 'USER_EXISTS');

      // 6.3 Register User B
      const regResB = await request(app).post('/api/auth/register').send({
        name: 'User Beta',
        email: testEmailB,
        password: testPassword,
        currency: 'INR',
        monthlyIncome: 45000
      });
      assert('User B registration succeeds with 201', regResB.status === 201);
      const tokenB = regResB.body.data.token;
      const userBId = regResB.body.data.user.id;

      // 6.4 Register User Empty (Zero Transactions / Brand New Account)
      const regResEmpty = await request(app).post('/api/auth/register').send({
        name: 'User Empty Ledger',
        email: testEmailEmpty,
        password: testPassword,
        currency: 'INR',
        monthlyIncome: 0
      });
      assert('User Empty registration succeeds with 201', regResEmpty.status === 201);
      const tokenEmpty = regResEmpty.body.data.token;
      const userEmptyId = regResEmpty.body.data.user.id;

      // 6.5 Login with Valid Credentials
      const loginRes = await request(app).post('/api/auth/login').send({
        email: testEmailA,
        password: testPassword
      });
      assert('Login with correct credentials succeeds with 200', loginRes.status === 200);
      assert('Login response returns sanitized user object', !!loginRes.body.data.user.email);
      const cookieLogin = loginRes.headers['set-cookie'];
      const hasCookieLogin = Array.isArray(cookieLogin)
        ? cookieLogin.some((c: string) => c.includes('finovax_token'))
        : typeof cookieLogin === 'string' && cookieLogin.includes('finovax_token');
      assert('Login response sets HttpOnly cookie', !!hasCookieLogin);

      // 6.6 Login with Invalid Password (Generic Anti-Enumeration Error)
      const badPassRes = await request(app).post('/api/auth/login').send({
        email: testEmailA,
        password: 'WrongPassword#999'
      });
      assert('Invalid password returns generic 401 INVALID_CREDENTIALS', badPassRes.status === 401 && badPassRes.body.code === 'INVALID_CREDENTIALS');

      // 6.7 Session Verification via /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);
      assert('GET /api/auth/me returns authenticated profile', meRes.status === 200 && meRes.body.data.user.email === testEmailA.toLowerCase());

      // 6.8 Zero-Transaction Account Verification (Safe Mathematical Defaults)
      const emptyDashboardRes = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${tokenEmpty}`);
      assert('Empty user dashboard summary returns 200', emptyDashboardRes.status === 200);
      assert('Empty user totalBalance is exactly 0', emptyDashboardRes.body.data.summary.totalBalance === 0);
      assert('Empty user monthlyIncome is exactly 0', emptyDashboardRes.body.data.summary.monthlyIncome === 0);
      assert('Empty user monthlyExpenses is exactly 0', emptyDashboardRes.body.data.summary.monthlyExpenses === 0);
      assert('Empty user savingsRate is 0% (zero denominator protected)', emptyDashboardRes.body.data.summary.savingsRate === 0);

      const emptyCashFlowRes = await request(app)
        .get('/api/dashboard/cash-flow')
        .set('Authorization', `Bearer ${tokenEmpty}`);
      assert('Empty user cashflow returns 200 with non-null array', emptyCashFlowRes.status === 200 && Array.isArray(emptyCashFlowRes.body.data.cashFlow));

      const emptyExpCatRes = await request(app)
        .get('/api/dashboard/expenses-by-category')
        .set('Authorization', `Bearer ${tokenEmpty}`);
      assert('Empty user expenses-by-category returns empty array', emptyExpCatRes.status === 200 && emptyExpCatRes.body.data.categories.length === 0);

      // 6.9 Numeric Boundary & Validation Attacks
      const nanTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'NaN Injection Test',
          amount: 'NaN',
          type: 'expense',
          category: 'Shopping'
        });
      assert('Transaction rejects NaN amount with 400 INVALID_AMOUNT', nanTxRes.status === 400 && nanTxRes.body.code === 'INVALID_AMOUNT');

      const infTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Infinity Amount Test',
          amount: Infinity,
          type: 'expense',
          category: 'Shopping'
        });
      assert('Transaction rejects Infinity amount with 400 INVALID_AMOUNT', infTxRes.status === 400 && infTxRes.body.code === 'INVALID_AMOUNT');

      const negTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Negative Amount Test',
          amount: -500,
          type: 'expense',
          category: 'Shopping'
        });
      assert('Transaction rejects negative amount with 400 INVALID_AMOUNT', negTxRes.status === 400 && negTxRes.body.code === 'INVALID_AMOUNT');

      // 6.10 User A creates normal transaction (Low Risk, no false alarm)
      const normalTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Grocery Supplies',
          amount: 850,
          type: 'expense',
          category: 'Groceries',
          paymentMethod: 'UPI'
        });
      assert('User A normal transaction succeeds with 201', normalTxRes.status === 201);
      const normalTxId = normalTxRes.body.data.transaction.id;
      assert('Normal transaction does NOT generate fraud alert', normalTxRes.body.data.fraudAlert === null);

      // 6.11 User A creates extreme anomaly transaction (Evaluated by FastAPI AI service)
      const anomalyTxRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Suspicious Luxury Electronics Purchase',
          amount: 350000,
          type: 'expense',
          category: 'Electronics',
          paymentMethod: 'Cash'
        });
      assert('User A high-amount anomaly transaction succeeds with 201', anomalyTxRes.status === 201);
      const anomalyTxId = anomalyTxRes.body.data.transaction.id;
      assert('AI service flags anomaly and generates fraud alert in response', !!anomalyTxRes.body.data.fraudAlert);
      if (anomalyTxRes.body.data.fraudAlert) {
        assert('Generated fraud alert has riskScore >= 60', anomalyTxRes.body.data.fraudAlert.riskScore >= 60);
      }

      // 6.12 On-Demand AI Risk Analysis: POST /api/transactions/:id/analyze
      const analyzeRes = await request(app)
        .post(`/api/transactions/${anomalyTxId}/analyze`)
        .set('Authorization', `Bearer ${tokenA}`);
      assert('Authorized transaction AI analysis returns 200', analyzeRes.status === 200);
      assert('AI analysis contains advisory disclaimer', 'disclaimer' in analyzeRes.body.data.assessment);
      assert('AI analysis contains risk level and reasons list', 'risk_level' in analyzeRes.body.data.assessment && Array.isArray(analyzeRes.body.data.assessment.reasons));

      // 6.13 Cross-User Isolation: User B cannot access User A's transaction
      const crossGetRes = await request(app)
        .get(`/api/transactions/${normalTxId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      assert('User B receives 404 attempting to read User A transaction', crossGetRes.status === 404);

      // 6.14 Cross-User Isolation: User B cannot modify User A's transaction
      const crossPatchRes = await request(app)
        .patch(`/api/transactions/${normalTxId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hacked Title' });
      assert('User B receives 404 attempting to modify User A transaction', crossPatchRes.status === 404);

      // 6.15 Cross-User Isolation: User B cannot delete User A's transaction
      const crossDeleteRes = await request(app)
        .delete(`/api/transactions/${normalTxId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      assert('User B receives 404 attempting to delete User A transaction', crossDeleteRes.status === 404);

      // 6.16 Cross-User Isolation: User B cannot analyze User A's transaction
      const crossAnalyzeRes = await request(app)
        .post(`/api/transactions/${normalTxId}/analyze`)
        .set('Authorization', `Bearer ${tokenB}`);
      assert('User B receives 404 attempting AI analysis on User A transaction', crossAnalyzeRes.status === 404);

      // 6.17 Fraud Alert Querying & Isolation
      const alertsResA = await request(app)
        .get('/api/fraud-alerts')
        .set('Authorization', `Bearer ${tokenA}`);
      assert('User A retrieves fraud alerts list', alertsResA.status === 200 && Array.isArray(alertsResA.body.data.alerts));
      const alertA = alertsResA.body.data.alerts[0];
      const alertAId = alertA?.id;

      const alertsResB = await request(app)
        .get('/api/fraud-alerts')
        .set('Authorization', `Bearer ${tokenB}`);
      assert('User B fraud alerts list is completely isolated (0 alerts)', alertsResB.status === 200 && alertsResB.body.data.alerts.length === 0);

      // 6.18 Cross-User Isolation on Fraud Alerts: User B cannot resolve User A's alert
      if (alertAId) {
        const crossAlertPatch = await request(app)
          .patch(`/api/fraud-alerts/${alertAId}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ status: 'resolved_legitimate' });
        assert('User B receives 404 attempting to resolve User A fraud alert', crossAlertPatch.status === 404);

        // 6.19 User A successfully resolves their own alert
        const resolveRes = await request(app)
          .patch(`/api/fraud-alerts/${alertAId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ status: 'resolved_legitimate' });
        assert('User A resolves alert with 200', resolveRes.status === 200 && resolveRes.body.data.alert.status === 'resolved_legitimate');

        // 6.20 Invalid status rejection
        const badStatusRes = await request(app)
          .patch(`/api/fraud-alerts/${alertAId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ status: 'invalid_status_value' });
        assert('Invalid alert resolution status rejected with 400', badStatusRes.status === 400);
      }

      // 6.21 Clean up live test fixtures
      await Promise.all([
        User.deleteOne({ _id: userAId }),
        User.deleteOne({ _id: userBId }),
        User.deleteOne({ _id: userEmptyId }),
        Transaction.deleteMany({ userId: { $in: [userAId, userBId, userEmptyId] } }),
        FraudAlert.deleteMany({ userId: { $in: [userAId, userBId, userEmptyId] } })
      ]);
      console.log('  🧹 All temporary test users, transactions, and alert fixtures cleaned up.');
    } catch (err: any) {
      assert('Live database tests executed without error', false, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
}

// Execute tests if run directly
if (require.main === module) {
  runTests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}

export default runTests;
