/**
 * FINOVAX PHASE 3: AI INTELLIGENCE ENGINE BACKEND INTEGRATION TEST SUITE
 * Deterministic unit and integration tests for AI health check, category prediction,
 * statistical fraud anomaly scoring, spending forecasting contracts, and behavioral segmentation.
 */

import {
  checkAiServiceHealth,
  predictTransactionCategory,
  evaluateTransactionRisk,
  predictSpendingForecast,
  predictCustomerSegmentation,
  sendCategoryCorrection
} from '../services/aiService';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${description}${details ? ` -> ${details}` : ''}`);
  }
}

async function runAiIntegrationTests() {
  console.log('\n================================================================');
  console.log('🧪 FINOVAX PHASE 3: AI INTELLIGENCE SERVICE INTEGRATION SUITE');
  console.log('================================================================\n');

  // 1. AI Service Health Fallback Test
  console.log('--- 1. Health Ping & Fault Tolerance ---');
  try {
    const health = await checkAiServiceHealth();
    assert('checkAiServiceHealth returns valid structured status', typeof health.connected === 'boolean');
    assert('Health reports url endpoint string', health.url.length > 0);
  } catch (err: any) {
    assert('checkAiServiceHealth never crashes the calling thread', false, err.message);
  }

  // 2. Transaction Categorization & Rule-Based Fallback
  console.log('\n--- 2. Intelligent Categorization & Active Learning ---');
  try {
    const swiggyPred = await predictTransactionCategory({ title: 'Swiggy Dinner Order Delivery', amount: 350 });
    assert('Predicts Food category for Swiggy narration', swiggyPred.category === 'Food');
    assert('Categorization returns valid confidence score', swiggyPred.confidence >= 0.40);
    assert('Categorization returns legitimate source (ml or rule_based)', ['ml', 'rule_based'].includes(swiggyPred.source));

    const salaryPred = await predictTransactionCategory({ title: 'Corporate Payroll Monthly Salary', amount: 85000, direction: 'credit' });
    assert('Predicts Salary for corporate payroll inflow', salaryPred.category === 'Salary');

    const correctionRes = await sendCategoryCorrection({
      title: 'Third Wave Coffee Roasters',
      category: 'Food',
      previousCategory: 'Shopping'
    });
    assert('sendCategoryCorrection returns valid recording status', ['SUCCESS', 'RECORDED_LOCALLY'].includes(correctionRes.status));
  } catch (err: any) {
    assert('Categorization runs with non-blocking resilience', false, err.message);
  }

  // 3. Statistical Anomaly & Fraud Risk Scoring
  console.log('\n--- 3. Anomaly Scoring & Fraud Risk Triage ---');
  try {
    // Normal transaction within historical bounds
    const lowRiskTx = await evaluateTransactionRisk({
      amount: 450,
      type: 'expense',
      category: 'Food',
      title: 'Subway Meal',
      user_avg_amount: 500,
      user_std_amount: 100,
      user_tx_count: 20
    });
    assert('Normal expense receives LOW risk level', lowRiskTx.risk_level === 'LOW');
    assert('Normal expense is NOT flagged as anomaly', !lowRiskTx.is_anomaly);
    assert('Risk score is <= 40 for normal transaction', lowRiskTx.risk_score <= 40);
    assert('Disclaimer states statistical variance nature', lowRiskTx.disclaimer.includes('statistical anomaly'));

    // High Outlier Anomaly (z-score > 3.5, 20x average)
    const highRiskTx = await evaluateTransactionRisk({
      amount: 95000,
      type: 'expense',
      category: 'Electronics',
      title: 'Suspicious High Value Outlier',
      user_avg_amount: 1200,
      user_std_amount: 250,
      user_tx_count: 25
    });
    assert('Outlier expense receives HIGH risk level', highRiskTx.risk_level === 'HIGH');
    assert('Outlier expense is flagged as anomaly', highRiskTx.is_anomaly);
    assert('High risk score is >= 70', highRiskTx.risk_score >= 70);
    assert('Provides explainable risk contributing reasons', highRiskTx.reasons.length > 0);
  } catch (err: any) {
    assert('Fraud risk evaluation runs cleanly', false, err.message);
  }

  // 4. Spending Forecast Strict Data Contract
  console.log('\n--- 4. Spending Forecast Data Contract & Insufficient History ---');
  try {
    // History < 3 months must return INSUFFICIENT_DATA
    const insufficientForecast = await predictSpendingForecast([
      { month: '2026-06', amount: 35000 },
      { month: '2026-07', amount: 37000 }
    ]);
    assert('Forecast returns INSUFFICIENT_DATA when history < 3 months', insufficientForecast.status === 'INSUFFICIENT_DATA');
    assert('Forecast array is empty on insufficient data', insufficientForecast.forecasts.length === 0);

    // History >= 3 months generates valid trajectory
    const validForecast = await predictSpendingForecast([
      { month: '2026-04', amount: 34000 },
      { month: '2026-05', amount: 36000 },
      { month: '2026-06', amount: 35500 }
    ]);
    assert('Forecast succeeds with >= 3 months history', validForecast.status === 'SUCCESS');
    assert('Forecast produces horizon projection points', validForecast.forecasts.length >= 3);
    assert('Confidence bounds bracket predicted amount', validForecast.forecasts[0].lowerBound <= validForecast.forecasts[0].predictedAmount && validForecast.forecasts[0].upperBound >= validForecast.forecasts[0].predictedAmount);
  } catch (err: any) {
    assert('Forecasting contracts evaluate cleanly', false, err.message);
  }

  // 5. Customer Persona & Spending Segmentation
  console.log('\n--- 5. Behavioral Persona & Customer Segmentation ---');
  try {
    const discretionarySegment = await predictCustomerSegmentation({
      monthlyAvgSpend: 75000,
      essentialRatio: 0.30,
      discretionaryRatio: 0.60,
      transactionFrequency: 45,
      savingsRate: 0.10
    });
    assert('Identifies High Volume Discretionary persona', discretionarySegment.persona === 'High Volume Discretionary');
    assert('Assigns valid cluster ID 2', discretionarySegment.clusterId === 2);
    assert('Provides targeted financial habit recommendations', discretionarySegment.recommendations.length > 0);

    const saverSegment = await predictCustomerSegmentation({
      monthlyAvgSpend: 15000,
      essentialRatio: 0.40,
      discretionaryRatio: 0.15,
      transactionFrequency: 15,
      savingsRate: 0.45
    });
    assert('Identifies Low Spending & High Savings persona', saverSegment.persona === 'Low Spending & High Savings');
    assert('Assigns valid cluster ID 0', saverSegment.clusterId === 0);
  } catch (err: any) {
    assert('Customer segmentation evaluates cleanly', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 AI INTEGRATION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiIntegrationTests().catch(err => {
  console.error('Fatal AI test error:', err);
  process.exit(1);
});

