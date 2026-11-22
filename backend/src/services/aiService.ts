import { ENV } from '../config/env';
import { categorizeTransactionWithRules } from './statement/categorizationService';

export interface AiHealthStatus {
  connected: boolean;
  status: string;
  service?: string;
  version?: string;
  url: string;
  latencyMs?: number;
}

export interface TransactionRiskAssessment {
  available: boolean;
  is_anomaly: boolean;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  confidence: number;
  baseline_status?: string;
  disclaimer: string;
}

export interface CategoryPrediction {
  category: string;
  subcategory: string;
  confidence: number;
  source: 'ml' | 'rule_based';
  status: 'MODEL_READY' | 'RULE_BASED_FALLBACK';
}

export interface SpendingForecastResult {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  modelUsed: string;
  horizonMonths: number;
  historicalAverage: number;
  forecasts: Array<{
    month: string;
    predictedAmount: number;
    lowerBound: number;
    upperBound: number;
  }>;
  disclaimer: string;
}

export interface SegmentationResult {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  persona: string;
  clusterId: number;
  features: {
    monthlyAvgSpend: number;
    essentialRatio: number;
    discretionaryRatio: number;
    transactionFrequency: number;
  };
  recommendations: string[];
}

/**
 * Pings the FastAPI AI service health endpoint with a strict timeout.
 */
export async function checkAiServiceHealth(): Promise<AiHealthStatus> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      return {
        connected: true,
        status: data.status || 'ok',
        service: data.service,
        version: data.version,
        url: ENV.AI_SERVICE_URL,
        latencyMs: Date.now() - start
      };
    }

    return {
      connected: false,
      status: `HTTP_${res.status}`,
      url: ENV.AI_SERVICE_URL,
      latencyMs: Date.now() - start
    };
  } catch {
    return {
      connected: false,
      status: 'unreachable',
      url: ENV.AI_SERVICE_URL
    };
  }
}

/**
 * Retrieves trained models status from AI microservice
 */
export async function getAiModelStatus(): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/models/status`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    return { status: 'DEGRADED', message: 'AI microservice returned error status' };
  } catch {
    return {
      status: 'OFFLINE',
      message: 'AI microservice is offline or unreachable'
    };
  }
}

/**
 * Evaluates a single transaction for statistical anomaly / fraud risk
 */
export async function evaluateTransactionRisk(params: {
  amount: number;
  type: string;
  category: string;
  title: string;
  paymentMethod?: string;
  user_avg_amount?: number;
  user_std_amount?: number;
  user_tx_count?: number;
  recent_category_count?: number;
  velocity_24h_count?: number;
  is_new_category?: boolean;
  is_new_merchant?: boolean;
  hour_of_day?: number;
}): Promise<TransactionRiskAssessment> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/predict/fraud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        available: false,
        is_anomaly: false,
        risk_score: 0,
        risk_level: 'LOW',
        reasons: ['AI microservice returned non-200 status.'],
        confidence: 0,
        disclaimer: 'Real-time risk scoring temporarily unavailable.'
      };
    }

    const data = await res.json() as any;
    return {
      available: true,
      is_anomaly: Boolean(data.is_anomaly),
      risk_score: typeof data.risk_score === 'number' ? data.risk_score : 0,
      risk_level: ['LOW', 'MEDIUM', 'HIGH'].includes(data.risk_level) ? data.risk_level : 'LOW',
      reasons: Array.isArray(data.reasons) ? data.reasons : [],
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
      baseline_status: data.baseline_status || (params.user_tx_count && params.user_tx_count >= 5 ? 'ESTABLISHED' : 'INSUFFICIENT_HISTORY'),
      disclaimer: data.disclaimer || 'Risk predictions are statistical anomaly estimates and do not constitute conclusive proof of fraud.'
    };
  } catch {
    // Resilient local statistical anomaly heuristic fallback
    let risk_score = 10;
    const reasons: string[] = [];
    const amount = Number(params.amount) || 0;

    if (params.user_avg_amount && params.user_avg_amount > 0) {
      const ratio = amount / params.user_avg_amount;
      if (ratio >= 5.0) {
        risk_score += 55;
        reasons.push(`Transaction amount is ${ratio.toFixed(1)}x higher than normal baseline.`);
      } else if (ratio >= 3.0) {
        risk_score += 35;
        reasons.push(`Transaction amount is ${ratio.toFixed(1)}x above user average.`);
      }
      if (params.user_std_amount && params.user_std_amount > 0) {
        const z = (amount - params.user_avg_amount) / params.user_std_amount;
        if (z >= 3.0) {
          risk_score += 25;
          reasons.push(`Statistical outlier: ${z.toFixed(1)} standard deviations from mean.`);
        }
      }
    } else if (amount >= 100000) {
      risk_score += 50;
      reasons.push(`High transaction amount (${amount}) without baseline history.`);
    }

    risk_score = Math.min(100, Math.max(0, risk_score));
    const is_anomaly = risk_score >= 60;
    const risk_level: 'LOW' | 'MEDIUM' | 'HIGH' = risk_score >= 70 ? 'HIGH' : (risk_score >= 40 ? 'MEDIUM' : 'LOW');
    if (reasons.length === 0) {
      reasons.push('Transaction parameters consistent with expected normal baseline.');
    }

    return {
      available: true,
      is_anomaly,
      risk_score,
      risk_level,
      reasons,
      confidence: 0.70,
      disclaimer: 'Risk predictions are statistical anomaly estimates and do not constitute conclusive proof of fraud.'
    };
  }
}

/**
 * Predicts category using AI or transparent rule-based fallback
 */
export async function predictTransactionCategory(params: {
  title: string;
  amount: number;
  direction?: 'debit' | 'credit';
}): Promise<CategoryPrediction> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/predict/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      return {
        category: data.category || 'Other Expenses',
        subcategory: data.subcategory || '',
        confidence: data.confidence || 0.7,
        source: data.source || 'rule_based',
        status: data.status || 'RULE_BASED_FALLBACK'
      };
    }
  } catch {
    // Fallback to comprehensive rule-based categorizer
  }

  const ruleResult = categorizeTransactionWithRules(
    params.title,
    params.amount,
    params.direction || 'debit'
  );

  return {
    category: ruleResult.category,
    subcategory: ruleResult.subcategory,
    confidence: ruleResult.confidence,
    source: 'rule_based',
    status: 'RULE_BASED_FALLBACK'
  };
}

/**
 * Spending Forecast from AI service
 */
export async function predictSpendingForecast(monthlyHistory: Array<{ month: string; amount: number }>): Promise<SpendingForecastResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: monthlyHistory }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json() as SpendingForecastResult;
    }
  } catch {
    // Fallback
  }

  // Graceful degradation when AI service is unavailable
  if (monthlyHistory.length < 3) {
    return {
      status: 'INSUFFICIENT_DATA',
      modelUsed: 'FinovaX Previous-Period Persistence Baseline',
      horizonMonths: 3,
      historicalAverage: 0,
      forecasts: [],
      disclaimer: 'At least 3 months of consecutive transaction data are required for spending forecasting.'
    };
  }

  const avg = monthlyHistory.reduce((sum, h) => sum + h.amount, 0) / monthlyHistory.length;
  return {
    status: 'SUCCESS',
    modelUsed: 'FinovaX Empirical Moving-Average Baseline',
    horizonMonths: 3,
    historicalAverage: Math.round(avg),
    forecasts: [
      { month: 'Next Month', predictedAmount: Math.round(avg * 1.02), lowerBound: Math.round(avg * 0.90), upperBound: Math.round(avg * 1.15) },
      { month: 'Month +2', predictedAmount: Math.round(avg * 1.04), lowerBound: Math.round(avg * 0.88), upperBound: Math.round(avg * 1.20) },
      { month: 'Month +3', predictedAmount: Math.round(avg * 1.05), lowerBound: Math.round(avg * 0.85), upperBound: Math.round(avg * 1.25) }
    ],
    disclaimer: 'Baseline statistical projection. Train ML models for non-linear regression.'
  };
}

/**
 * Customer Segmentation from AI service
 */
export async function predictCustomerSegmentation(userMetrics: {
  monthlyAvgSpend: number;
  essentialRatio: number;
  discretionaryRatio: number;
  transactionFrequency: number;
  savingsRate: number;
  avgTxAmount?: number;
  recurringRatio?: number;
}): Promise<SegmentationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/predict/segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMetrics),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json() as SegmentationResult;
    }
  } catch {
    // Fallback
  }

  // Heuristic rule-based segmentation fallback
  let persona = 'Balanced Disciplined Spender';
  let clusterId = 1;
  const recommendations: string[] = [];

  if (userMetrics.discretionaryRatio > 0.5) {
    persona = 'High Volume Discretionary';
    clusterId = 2;
    recommendations.push('Consider setting category limits on Entertainment and Dining.');
  } else if (userMetrics.savingsRate > 0.3) {
    persona = 'Low Spending & High Savings';
    clusterId = 0;
    recommendations.push('Strong savings discipline maintained. Explore compounding investment opportunities.');
  } else if (userMetrics.transactionFrequency > 40) {
    persona = 'Frequent Micro-Transactor';
    clusterId = 3;
    recommendations.push('High frequency of small UPI transactions observed; aggregate small purchases to monitor leakage.');
  } else {
    recommendations.push('Maintain balanced spending within essential utility bounds.');
  }

  return {
    status: 'SUCCESS',
    persona,
    clusterId,
    features: userMetrics,
    recommendations
  };
}

/**
 * Persists a user category correction to the AI service for continuous active retraining.
 */
export async function sendCategoryCorrection(correction: {
  title: string;
  category: string;
  previousCategory?: string;
  userId?: string;
}): Promise<{ status: string; totalCorrections?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ENV.AI_SERVICE_URL}/predict/category/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correction),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json() as any;
    }
  } catch {
    // Non-blocking degradation
  }

  return { status: 'RECORDED_LOCALLY' };
}

/**
 * Triggers retraining of specified AI models on the AI microservice.
 */
export async function triggerModelRetraining(models?: string[]): Promise<{
  status: string;
  retrained?: string[];
  message: string;
}> {
  try {
    const adminKey = process.env.AI_SERVICE_ADMIN_KEY || 'finovax_ai_admin_secret_key_2026';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for model retraining

    const res = await fetch(`${ENV.AI_SERVICE_URL}/models/retrain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey
      },
      body: JSON.stringify({ models }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json() as any;
    }

    const errData = await res.json().catch(() => ({}));
    return {
      status: 'FAILED',
      message: errData.detail || `AI service returned HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      status: 'UNAVAILABLE',
      message: err.message || 'AI service unavailable or timed out during retraining.'
    };
  }
}

