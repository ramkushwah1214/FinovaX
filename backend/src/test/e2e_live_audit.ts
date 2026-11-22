const BASE_URL = 'http://localhost/api';

async function request(path: string, method = 'GET', body: any = null, headers: any = {}) {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, data: json };
}

async function runE2EAudit() {
  console.log('================================================================');
  console.log('🧪 FINOVAX PHASE 7: LIVE CONTAINER E2E USER WORKFLOW AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${desc} ${detail ? '— ' + detail : ''}`);
      failed++;
    }
  }

  // 1. Health check over port 80
  const healthRes = await request('/health');
  assert('GET /api/health returns 200 via Nginx ingress', healthRes.status === 200);
  assert('Health reports database connected', healthRes.data?.database?.status === 'connected');
  assert('Health reports AI service connected', healthRes.data?.aiService?.status === 'ok');

  // 2. Register temporary test user
  const testEmail = `audit_phase7_${Date.now()}@finovax.internal`;
  const regRes = await request('/auth/register', 'POST', {
    name: 'Phase 7 Audit User',
    email: testEmail,
    password: 'Password@2026',
    monthlyIncome: 75000,
    currency: 'INR'
  });
  assert('POST /api/auth/register returns 201', regRes.status === 201);
  const token = regRes.data?.data?.token;
  const userId = regRes.data?.data?.user?.id;
  assert('Registration returns valid JWT token', typeof token === 'string' && token.length > 20);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Authenticated profile check: GET /api/auth/me
  const meRes = await request('/auth/me', 'GET', null, authHeaders);
  assert('GET /api/auth/me returns 200 with user profile', meRes.status === 200 && meRes.data?.data?.user?.email === testEmail);

  // 4. Initial Empty Dashboard
  const dashRes = await request('/dashboard/summary', 'GET', null, authHeaders);
  assert('GET /api/dashboard/summary returns 200', dashRes.status === 200);
  assert('Empty dashboard totalBalance is 0', dashRes.data?.data?.summary?.totalBalance === 0);

  // 5. Establish user spending history with 5 normal transactions
  const createdTxIds: string[] = [];
  const normalTxs = [
    { title: 'Swiggy Dinner Delivery', amount: 450, type: 'expense', category: 'Food' },
    { title: 'Uber Commute', amount: 320, type: 'expense', category: 'Transportation' },
    { title: 'Amazon Grocery', amount: 1200, type: 'expense', category: 'Shopping' },
    { title: 'Blue Tokai Coffee', amount: 280, type: 'expense', category: 'Food' },
    { title: 'Metro Smart Card Recharge', amount: 500, type: 'expense', category: 'Transportation' }
  ];

  for (const tx of normalTxs) {
    const res = await request('/transactions', 'POST', tx, authHeaders);
    if (res.status === 201 && res.data?.data?.transaction?.id) {
      createdTxIds.push(res.data.data.transaction.id);
    }
  }
  assert('Established 5 baseline transactions (201)', createdTxIds.length === 5);

  // 6. Test AI Categorization via /api/ai/categorize
  const catRes = await request('/ai/categorize', 'POST', {
    title: 'Swiggy Online Food Bangalore',
    amount: 550,
    direction: 'debit'
  }, authHeaders);
  assert('POST /api/ai/categorize returns 200', catRes.status === 200);
  assert('Categorization predicts Food category', catRes.data?.data?.category === 'Food');
  assert('Categorization returns valid confidence score', typeof catRes.data?.data?.confidence === 'number');

  // 7. Add Outlier Anomaly Transaction (now that baseline is established)
  const txAnomalyRes = await request('/transactions', 'POST', {
    title: 'Suspicious Luxury Electronics Purchase',
    amount: 350000,
    type: 'expense',
    category: 'Electronics',
    paymentMethod: 'Cash',
    date: new Date().toISOString()
  }, authHeaders);
  assert('POST /api/transactions (Outlier) returns 201', txAnomalyRes.status === 201);
  const anomalyTxId = txAnomalyRes.data?.data?.transaction?.id;
  if (anomalyTxId) createdTxIds.push(anomalyTxId);
  const fraudAlert = txAnomalyRes.data?.data?.fraudAlert;
  assert('Outlier transaction generates a fraud alert', !!fraudAlert);
  assert('Fraud alert has HIGH risk level', fraudAlert?.riskLevel === 'HIGH');
  assert('Fraud alert riskScore >= 60', fraudAlert?.riskScore >= 60);

  // 8. Fraud Intelligence alerts listing: GET /api/fraud-alerts
  const alertsRes = await request('/fraud-alerts', 'GET', null, authHeaders);
  assert('GET /api/fraud-alerts returns 200', alertsRes.status === 200);
  const alertsList = alertsRes.data?.data?.alerts || [];
  assert('Alerts list contains newly generated fraud alert', alertsList.length >= 1);
  const alertId = alertsList[0]?._id;

  // 9. Resolve Fraud Alert: PATCH /api/fraud-alerts/:id
  if (alertId) {
    const resolveRes = await request(`/fraud-alerts/${alertId}`, 'PATCH', {
      status: 'resolved',
      resolution: 'VERIFIED_USER',
      notes: 'Verified by audit script'
    }, authHeaders);
    assert('PATCH /api/fraud-alerts/:id resolves alert with 200', resolveRes.status === 200);
  }

  // 10. Update Transaction: PUT /api/transactions/:id
  if (createdTxIds[0]) {
    const updateRes = await request(`/transactions/${createdTxIds[0]}`, 'PUT', {
      title: 'Swiggy Dinner Delivery (Updated)',
      amount: 520,
      type: 'expense',
      category: 'Food',
      date: new Date().toISOString()
    }, authHeaders);
    assert('PUT /api/transactions/:id updates transaction with 200', updateRes.status === 200);
  }

  // 11. Budget Creation & Verification
  const budgetRes = await request('/budgets', 'POST', {
    category: 'Food',
    limitAmount: 10000,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  }, authHeaders);
  assert('POST /api/budgets returns 201', budgetRes.status === 201);
  const budgetId = budgetRes.data?.data?._id;

  const getBudgetsRes = await request('/budgets', 'GET', null, authHeaders);
  assert('GET /api/budgets returns 200 with budget list', getBudgetsRes.status === 200);

  // 12. Financial Goal Management
  const goalRes = await request('/goals', 'POST', {
    title: 'Emergency Fund',
    targetAmount: 150000,
    currentAmount: 25000,
    targetDate: new Date(Date.now() + 365*24*3600*1000).toISOString(),
    category: 'Savings'
  }, authHeaders);
  assert('POST /api/goals returns 201', goalRes.status === 201);
  const goalId = goalRes.data?.data?._id;

  const getGoalsRes = await request('/goals', 'GET', null, authHeaders);
  assert('GET /api/goals returns 200 with goals list', getGoalsRes.status === 200);

  // 13. Recurring Payments Management (/api/recurring-payments)
  const billRes = await request('/recurring-payments', 'POST', {
    title: 'Broadband Internet Fiber',
    amount: 1199,
    category: 'Utilities',
    dueDate: new Date(Date.now() + 10*24*3600*1000).toISOString(),
    frequency: 'monthly',
    provider: 'Airtel Xstream',
    autoDebit: false
  }, authHeaders);
  assert('POST /api/recurring-payments returns 201', billRes.status === 201);
  const billId = billRes.data?.data?.recurringPayment?._id || billRes.data?.data?._id;

  const getBillsRes = await request('/recurring-payments', 'GET', null, authHeaders);
  assert('GET /api/recurring-payments returns 200 with list', getBillsRes.status === 200);

  // 14. Reports Summary
  const reportsRes = await request('/reports/summary', 'GET', null, authHeaders);
  assert('GET /api/reports/summary returns 200', reportsRes.status === 200);

  // 15. Spending Forecast (AI Contract: /api/ai/forecast)
  const fcRes = await request('/ai/forecast', 'GET', null, authHeaders);
  assert('GET /api/ai/forecast returns 200 or handles minimum history guard', [200, 400].includes(fcRes.status));

  // 16. Spending Segmentation (AI Contract: /api/ai/segmentation)
  const segRes = await request('/ai/segmentation', 'GET', null, authHeaders);
  assert('GET /api/ai/segmentation returns 200 or handles minimum history guard', [200, 400].includes(segRes.status));

  // 17. Cleanup Temporary Fixtures
  console.log('\n  🧹 Cleaning up temporary test fixtures...');
  for (const txId of createdTxIds) {
    await request(`/transactions/${txId}`, 'DELETE', null, authHeaders);
  }
  if (budgetId) await request(`/budgets/${budgetId}`, 'DELETE', null, authHeaders);
  if (goalId) await request(`/goals/${goalId}`, 'DELETE', null, authHeaders);
  if (billId) await request(`/recurring-payments/${billId}`, 'DELETE', null, authHeaders);

  // 18. Logout
  const logoutRes = await request('/auth/logout', 'POST', null, authHeaders);
  assert('POST /api/auth/logout succeeds with 200', logoutRes.status === 200);

  // 19. Clean up test user record in MongoDB Atlas
  try {
    const mongoosePkg = await import('mongoose');
    const mongoose = (mongoosePkg as any).default || mongoosePkg;
    const { ENV } = await import('../config/env');
    const { User } = await import('../models/User');
    if (mongoose.connection && mongoose.connection.readyState !== 1) {
      await mongoose.connect(ENV.MONGODB_URI);
    }
    const delRes = await User.deleteMany({ email: { $regex: '^audit_phase7_' } });
    console.log(`  🧹 Purged ${delRes.deletedCount} temporary audit user records from MongoDB Atlas.`);
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.warn('  ⚠️ User cleanup notice:', err);
  }

  console.log(`\n================================================================`);
  console.log(`📊 E2E WORKFLOW AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log(`================================================================\n`);
}

runE2EAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
