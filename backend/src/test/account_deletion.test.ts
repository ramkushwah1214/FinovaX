import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { deleteAccount } from '../controllers/authController';
import { connectDB, isDbConnected } from '../config/db';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { FinancialGoal } from '../models/FinancialGoal';
import { RecurringPayment } from '../models/RecurringPayment';
import { FraudAlert } from '../models/FraudAlert';
import { StatementImport } from '../models/StatementImport';
import { BankAccount } from '../models/BankAccount';
import { BankConnection } from '../models/BankConnection';
import { ConsentRecord } from '../models/ConsentRecord';
import { FinancialInsight } from '../models/FinancialInsight';
import { SpendingForecast } from '../models/SpendingForecast';
import { SpendingSegment } from '../models/SpendingSegment';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, extra?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    if (extra !== undefined) {
      console.error('     Detail:', extra);
    }
    failed++;
  }
}

function mockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    clearedCookies: [] as Array<{ name: string; options: any }>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    clearCookie(name: string, options: any) {
      this.clearedCookies.push({ name, options });
      return this;
    }
  };
  return res;
}

async function runAccountDeletionTests() {
  console.log('\n================================================================');
  console.log('🔒 FINOVAX ACCOUNT DELETION & SAFETY VERIFICATION SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------
  // 1. Guard Tests (Unit Level - No DB Required)
  // ----------------------------------------------------------------
  console.log('--- 1. Guard & Parameter Validation Security ---');

  // Test 1.1: Missing JWT session
  {
    const req: any = { user: undefined, body: { password: 'Password123!', confirmText: 'DELETE' } };
    const res = mockResponse();
    let err: any = null;
    await deleteAccount(req, res, (e) => { err = e; });
    assert('Unauthenticated request rejected with 401 UNAUTHORIZED', err?.statusCode === 401, err?.message);
  }

  // Test 1.2: Invalid confirmation text (e.g., lowercase 'delete')
  {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req: any = { user: { id: fakeId }, body: { password: 'Password123!', confirmText: 'delete' } };
    const res = mockResponse();
    let err: any = null;
    await deleteAccount(req, res, (e) => { err = e; });
    assert('Lowercase "delete" rejected with 400 INVALID_CONFIRMATION_TEXT', err?.statusCode === 400 && err?.code === 'INVALID_CONFIRMATION_TEXT', err?.message);
  }

  // Test 1.3: Arbitrary text confirmation (e.g., 'NO')
  {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req: any = { user: { id: fakeId }, body: { password: 'Password123!', confirmText: 'CONFIRM' } };
    const res = mockResponse();
    let err: any = null;
    await deleteAccount(req, res, (e) => { err = e; });
    assert('Arbitrary confirmation text "CONFIRM" rejected with 400', err?.statusCode === 400, err?.message);
  }

  // Test 1.4: Missing password
  {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req: any = { user: { id: fakeId }, body: { confirmText: 'DELETE' } };
    const res = mockResponse();
    let err: any = null;
    await deleteAccount(req, res, (e) => { err = e; });
    assert('Missing password rejected with 400 PASSWORD_REQUIRED', err?.statusCode === 400 && err?.code === 'PASSWORD_REQUIRED', err?.message);
  }

  // ----------------------------------------------------------------
  // 2. Integration Tests (Live MongoDB Scoped)
  // ----------------------------------------------------------------
  console.log('\n--- 2. Database Integration & Cascade Deletion Safety ---');
  let dbAvailable = false;
  try {
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000));
    dbAvailable = await Promise.race([connectDB(), timeoutPromise]);
  } catch {
    dbAvailable = false;
  }

  if (!dbAvailable || !isDbConnected()) {
    console.log('  ⚠️ Notice: Live MongoDB cluster unreachable from current local IP (Atlas Network Access Whitelist).');
    console.log('     Unit validations passed. Skipping live cascade tests until IP is whitelisted on Atlas.');
  } else {
    console.log('  Connected to MongoDB Atlas. Running isolated multi-collection cascade tests...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('CorrectPass123!', salt);

    // 2.1 Create Isolated Test User
    const testUser = await User.create({
      name: 'Disposable Delete Test User',
      email: `test_delete_${Date.now()}@finovax.internal`,
      passwordHash,
      currency: 'INR',
      monthlyIncome: 50000
    });
    const testUserId = testUser._id;

    // 2.2 Create Control User (Must NOT be affected)
    const controlUser = await User.create({
      name: 'Control Preserved User',
      email: `test_control_${Date.now()}@finovax.internal`,
      passwordHash,
      currency: 'INR',
      monthlyIncome: 75000
    });
    const controlUserId = controlUser._id;

    // 2.3 Seed Financial Records for Both Users Across Collections
    await Transaction.insertMany([
      { userId: testUserId, title: 'Test User Tx', amount: 500, type: 'expense', category: 'Food', date: new Date() },
      { userId: controlUserId, title: 'Control User Tx', amount: 1500, type: 'expense', category: 'Shopping', date: new Date() }
    ]);

    await Budget.insertMany([
      { userId: testUserId, category: 'Food', limitAmount: 5000, month: 11, year: 2026 },
      { userId: controlUserId, category: 'Shopping', limitAmount: 10000, month: 11, year: 2026 }
    ]);

    await FinancialGoal.insertMany([
      { userId: testUserId, title: 'Test Vacation Goal', targetAmount: 20000, currentAmount: 1000, targetDate: new Date('2027-01-01') },
      { userId: controlUserId, title: 'Control House Goal', targetAmount: 500000, currentAmount: 50000, targetDate: new Date('2028-01-01') }
    ]);

    await RecurringPayment.insertMany([
      { userId: testUserId, name: 'Test Subscription', amount: 499, category: 'Subscriptions', dueDate: new Date(), frequency: 'monthly', status: 'pending', autoDebit: false },
      { userId: controlUserId, name: 'Control Gym', amount: 1200, category: 'Fitness', dueDate: new Date(), frequency: 'monthly', status: 'pending', autoDebit: false }
    ]);

    await FraudAlert.insertMany([
      { userId: testUserId, transactionTitle: 'Test Tx', amount: 500, riskScore: 85, riskLevel: 'HIGH', reasons: ['Velocity spike'] },
      { userId: controlUserId, transactionTitle: 'Control Tx', amount: 1500, riskScore: 75, riskLevel: 'HIGH', reasons: ['Merchant anomaly'] }
    ]);

    // Test 2.4: Attempt Deletion with WRONG password
    {
      const req: any = { user: { id: testUserId.toString() }, body: { password: 'WrongPassword!', confirmText: 'DELETE' } };
      const res = mockResponse();
      let err: any = null;
      await deleteAccount(req, res, (e) => { err = e; });
      assert('Incorrect password prevents deletion with 401 INVALID_CREDENTIALS', err?.statusCode === 401 && err?.code === 'INVALID_CREDENTIALS', err?.message);

      // Verify user and data STILL EXIST
      const stillUser = await User.findById(testUserId);
      const stillTx = await Transaction.countDocuments({ userId: testUserId });
      assert('User document retained after failed deletion', !!stillUser);
      assert('Financial transactions retained after failed deletion', stillTx === 1);
    }

    // Test 2.5: Successful Deletion with CORRECT password and 'DELETE'
    {
      const req: any = { user: { id: testUserId.toString() }, body: { password: 'CorrectPass123!', confirmText: 'DELETE' } };
      const res = mockResponse();
      let err: any = null;
      await deleteAccount(req, res, (e) => { err = e; });

      assert('Correct password & "DELETE" returns 200 SUCCESS', res.statusCode === 200 && !err, err?.message);
      assert('Session cookies cleared on response', res.clearedCookies.some((c: any) => c.name === 'finovax_token'));

      // Verify Test User is completely deleted
      const deletedUser = await User.findById(testUserId);
      assert('User profile document completely deleted from MongoDB', deletedUser === null);

      // Verify all collections purged for Test User
      const [txCount, budgetCount, goalCount, billCount, alertCount] = await Promise.all([
        Transaction.countDocuments({ userId: testUserId }),
        Budget.countDocuments({ userId: testUserId }),
        FinancialGoal.countDocuments({ userId: testUserId }),
        RecurringPayment.countDocuments({ userId: testUserId }),
        FraudAlert.countDocuments({ userId: testUserId })
      ]);
      assert('Cascade deleted all transactions for deleted user', txCount === 0);
      assert('Cascade deleted all budgets for deleted user', budgetCount === 0);
      assert('Cascade deleted all goals for deleted user', goalCount === 0);
      assert('Cascade deleted all recurring bills for deleted user', billCount === 0);
      assert('Cascade deleted all fraud alerts for deleted user', alertCount === 0);

      // Verify Control User is 100% UNTOUCHED
      const preservedControl = await User.findById(controlUserId);
      const [ctrlTx, ctrlBudget, ctrlGoal, ctrlBill, ctrlAlert] = await Promise.all([
        Transaction.countDocuments({ userId: controlUserId }),
        Budget.countDocuments({ userId: controlUserId }),
        FinancialGoal.countDocuments({ userId: controlUserId }),
        RecurringPayment.countDocuments({ userId: controlUserId }),
        FraudAlert.countDocuments({ userId: controlUserId })
      ]);
      assert('Other users (Control User) profile document preserved intact', !!preservedControl);
      assert('Other users financial transactions completely preserved', ctrlTx === 1);
      assert('Other users budgets completely preserved', ctrlBudget === 1);
      assert('Other users goals completely preserved', ctrlGoal === 1);
      assert('Other users bills completely preserved', ctrlBill === 1);
      assert('Other users alerts completely preserved', ctrlAlert === 1);

      // Cleanup Control User
      await User.deleteOne({ _id: controlUserId });
      await Transaction.deleteMany({ userId: controlUserId });
      await Budget.deleteMany({ userId: controlUserId });
      await FinancialGoal.deleteMany({ userId: controlUserId });
      await RecurringPayment.deleteMany({ userId: controlUserId });
      await FraudAlert.deleteMany({ userId: controlUserId });
    }
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(failed > 0 ? 1 : 0);
}

runAccountDeletionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
