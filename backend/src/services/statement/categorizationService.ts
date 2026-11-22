import { predictTransactionCategory } from '../aiService';

export interface CategorizationOutcome {
  category: string;
  subcategory: string;
  transactionType: string;
  confidence: number;
  source: 'ml' | 'rule_based' | 'default';
}

/**
 * 17-Class Comprehensive Rule-Based Financial Categorizer
 */
export function categorizeTransactionWithRules(
  description: string,
  amount: number,
  direction: 'debit' | 'credit'
): CategorizationOutcome {
  const desc = (description || '').toLowerCase();

  // Special Accounting Rule: Refunds & Reversals (NEVER count as income)
  if (
    desc.includes('refund') ||
    desc.includes('reversal') ||
    desc.includes('cashback') ||
    desc.includes('returned')
  ) {
    return {
      category: 'Other',
      subcategory: 'Refund',
      transactionType: 'refund',
      confidence: 0.95,
      source: 'rule_based'
    };
  }

  // Special Accounting Rule: Own-Account / Internal Transfers (NEVER count as income or expense)
  if (
    desc.includes('self transfer') ||
    desc.includes('own acc') ||
    desc.includes('fund transfer to self') ||
    desc.includes('trf to self') ||
    desc.includes('neft self') ||
    desc.includes('rtgs self') ||
    desc.includes('to self')
  ) {
    return {
      category: 'Own Account Transfer',
      subcategory: 'Internal Transfer',
      transactionType: 'transfer',
      confidence: 0.95,
      source: 'rule_based'
    };
  }

  // Credit / Inflows
  if (direction === 'credit') {
    if (
      desc.includes('salary') ||
      desc.includes('payroll') ||
      desc.includes('stipend') ||
      desc.includes('wage')
    ) {
      return {
        category: 'Salary',
        subcategory: 'Employment Income',
        transactionType: 'income',
        confidence: 0.95,
        source: 'rule_based'
      };
    }
    if (
      desc.includes('interest') ||
      desc.includes('int.pd') ||
      desc.includes('dividend') ||
      desc.includes('fd int')
    ) {
      return {
        category: 'Interest',
        subcategory: 'Investments & Savings',
        transactionType: 'income',
        confidence: 0.92,
        source: 'rule_based'
      };
    }
    if (
      desc.includes('client') ||
      desc.includes('invoice') ||
      desc.includes('freelance') ||
      desc.includes('consulting') ||
      desc.includes('settlement')
    ) {
      return {
        category: 'Business Income',
        subcategory: 'Professional Services',
        transactionType: 'income',
        confidence: 0.88,
        source: 'rule_based'
      };
    }
    return {
      category: 'Other Income',
      subcategory: 'General Inflow',
      transactionType: 'income',
      confidence: 0.65,
      source: 'rule_based'
    };
  }

  // Debit / Outflows
  // 1. Food & Dining
  if (
    desc.includes('swiggy') ||
    desc.includes('zomato') ||
    desc.includes('mcdonald') ||
    desc.includes('starbucks') ||
    desc.includes('domino') ||
    desc.includes('burger king') ||
    desc.includes('kfc') ||
    desc.includes('pizza') ||
    desc.includes('restaurant') ||
    desc.includes('cafe') ||
    desc.includes('dining') ||
    desc.includes('dhaba')
  ) {
    return {
      category: 'Food',
      subcategory: 'Restaurants & Delivery',
      transactionType: 'expense',
      confidence: 0.94,
      source: 'rule_based'
    };
  }

  // 2. Groceries
  if (
    desc.includes('blinkit') ||
    desc.includes('zepto') ||
    desc.includes('instamart') ||
    desc.includes('bigbasket') ||
    desc.includes('dmart') ||
    desc.includes('supermarket') ||
    desc.includes('hypermarket') ||
    desc.includes('provision') ||
    desc.includes('grocery') ||
    desc.includes('vegetable') ||
    desc.includes('dairy') ||
    desc.includes('milk')
  ) {
    return {
      category: 'Groceries',
      subcategory: 'Household Supplies',
      transactionType: 'expense',
      confidence: 0.95,
      source: 'rule_based'
    };
  }

  // 3. Travel & Transportation
  if (
    desc.includes('uber') ||
    desc.includes('ola') ||
    desc.includes('rapido') ||
    desc.includes('irctc') ||
    desc.includes('makemytrip') ||
    desc.includes('indigo') ||
    desc.includes('air india') ||
    desc.includes('metro') ||
    desc.includes('toll') ||
    desc.includes('fastag') ||
    desc.includes('railway') ||
    desc.includes('flight')
  ) {
    return {
      category: 'Travel',
      subcategory: 'Transit & Commute',
      transactionType: 'expense',
      confidence: 0.93,
      source: 'rule_based'
    };
  }

  // 4. Fuel
  if (
    desc.includes('fuel') ||
    desc.includes('petrol') ||
    desc.includes('diesel') ||
    desc.includes('cng') ||
    desc.includes('hpcl') ||
    desc.includes('bpcl') ||
    desc.includes('ioc') ||
    desc.includes('indian oil') ||
    desc.includes('gas station')
  ) {
    return {
      category: 'Fuel',
      subcategory: 'Automotive Fuel',
      transactionType: 'expense',
      confidence: 0.96,
      source: 'rule_based'
    };
  }

  // 5. Shopping & Retail
  if (
    desc.includes('amazon') ||
    desc.includes('flipkart') ||
    desc.includes('myntra') ||
    desc.includes('ajio') ||
    desc.includes('zara') ||
    desc.includes('h&m') ||
    desc.includes('retail') ||
    desc.includes('clothing') ||
    desc.includes('apparel') ||
    desc.includes('electronics')
  ) {
    return {
      category: 'Shopping',
      subcategory: 'Online & Retail',
      transactionType: 'expense',
      confidence: 0.90,
      source: 'rule_based'
    };
  }

  // 6. Bills & Utilities
  if (
    desc.includes('electricity') ||
    desc.includes('bescom') ||
    desc.includes('tneb') ||
    desc.includes('water board') ||
    desc.includes('airtel') ||
    desc.includes('jio') ||
    desc.includes('vodafone') ||
    desc.includes('broadband') ||
    desc.includes('wifi') ||
    desc.includes('gas cylinder') ||
    desc.includes('indane') ||
    desc.includes('utility') ||
    desc.includes('recharge')
  ) {
    return {
      category: 'Bills',
      subcategory: 'Utilities & Telecom',
      transactionType: 'expense',
      confidence: 0.94,
      source: 'rule_based'
    };
  }

  // 7. Subscriptions & Digital Services
  if (
    desc.includes('netflix') ||
    desc.includes('spotify') ||
    desc.includes('youtube') ||
    desc.includes('hotstar') ||
    desc.includes('prime video') ||
    desc.includes('apple.com/bill') ||
    desc.includes('google play') ||
    desc.includes('patreon') ||
    desc.includes('chatgpt') ||
    desc.includes('claude.ai') ||
    desc.includes('github')
  ) {
    return {
      category: 'Subscriptions',
      subcategory: 'Digital Services',
      transactionType: 'expense',
      confidence: 0.96,
      source: 'rule_based'
    };
  }

  // 8. Entertainment & Leisure
  if (
    desc.includes('bookmyshow') ||
    desc.includes('pvr') ||
    desc.includes('inox') ||
    desc.includes('cinema') ||
    desc.includes('theatre') ||
    desc.includes('gaming') ||
    desc.includes('steam') ||
    desc.includes('playstation')
  ) {
    return {
      category: 'Entertainment',
      subcategory: 'Movies & Leisure',
      transactionType: 'expense',
      confidence: 0.91,
      source: 'rule_based'
    };
  }

  // 9. Healthcare & Pharmacy
  if (
    desc.includes('pharmacy') ||
    desc.includes('chemist') ||
    desc.includes('apollo') ||
    desc.includes('medplus') ||
    desc.includes('1mg') ||
    desc.includes('hospital') ||
    desc.includes('clinic') ||
    desc.includes('dentist') ||
    desc.includes('diagnostics') ||
    desc.includes('pathology') ||
    desc.includes('doctor')
  ) {
    return {
      category: 'Healthcare',
      subcategory: 'Medical & Pharmacy',
      transactionType: 'expense',
      confidence: 0.94,
      source: 'rule_based'
    };
  }

  // 10. Education
  if (
    desc.includes('school') ||
    desc.includes('college') ||
    desc.includes('university') ||
    desc.includes('tuition') ||
    desc.includes('udemy') ||
    desc.includes('coursera') ||
    desc.includes('course') ||
    desc.includes('books') ||
    desc.includes('academy')
  ) {
    return {
      category: 'Education',
      subcategory: 'Learning & Books',
      transactionType: 'expense',
      confidence: 0.92,
      source: 'rule_based'
    };
  }

  // 11. Rent & Housing
  if (
    desc.includes('house rent') ||
    desc.includes('flat rent') ||
    desc.includes('maintenance') ||
    desc.includes('society maintenance') ||
    desc.includes('landlord') ||
    desc.includes('nobroker')
  ) {
    return {
      category: 'Rent',
      subcategory: 'Housing & Rent',
      transactionType: 'expense',
      confidence: 0.93,
      source: 'rule_based'
    };
  }

  // 12. Investments
  if (
    desc.includes('zerodha') ||
    desc.includes('groww') ||
    desc.includes('upstox') ||
    desc.includes('mutual fund') ||
    desc.includes('sip') ||
    desc.includes('kuvera') ||
    desc.includes('nps') ||
    desc.includes('etmoney') ||
    desc.includes('securities')
  ) {
    return {
      category: 'Investments',
      subcategory: 'Equities & Mutual Funds',
      transactionType: 'expense',
      confidence: 0.94,
      source: 'rule_based'
    };
  }

  // 13. Loan Payments & EMI
  if (
    desc.includes('emi') ||
    desc.includes('loan repayment') ||
    desc.includes('hdb finance') ||
    desc.includes('bajaj finance') ||
    desc.includes('home loan') ||
    desc.includes('car loan') ||
    desc.includes('credit card payment')
  ) {
    return {
      category: 'Loan Payments',
      subcategory: 'EMI & Debt Servicing',
      transactionType: 'expense',
      confidence: 0.95,
      source: 'rule_based'
    };
  }

  // 14. ATM & Cash Withdrawals
  if (
    desc.includes('atm wdl') ||
    desc.includes('cash wdl') ||
    desc.includes('atm cash') ||
    desc.includes('atm withdrawal') ||
    desc.includes('cash withdrawal')
  ) {
    return {
      category: 'ATM',
      subcategory: 'Cash Withdrawal',
      transactionType: 'cash',
      confidence: 0.97,
      source: 'rule_based'
    };
  }

  // Default fallback
  return {
    category: 'Other Expenses',
    subcategory: 'General Expense',
    transactionType: 'expense',
    confidence: 0.40,
    source: 'default'
  };
}

/**
 * Categorizes a transaction using AI if available, falling back to rules
 */
export async function categorizeTransactionSmart(
  description: string,
  amount: number,
  direction: 'debit' | 'credit'
): Promise<CategorizationOutcome> {
  const ruleOutcome = categorizeTransactionWithRules(description, amount, direction);

  // If rule match has high certainty (e.g. >= 0.90) or is a special accounting case (refund/transfer), prioritize rule
  if (ruleOutcome.confidence >= 0.90 || ruleOutcome.transactionType === 'refund' || ruleOutcome.transactionType === 'transfer') {
    return ruleOutcome;
  }

  // Query AI microservice
  try {
    const aiPrediction = await predictTransactionCategory({
      title: description,
      amount,
      direction
    });

    if (aiPrediction && aiPrediction.confidence >= 0.60 && aiPrediction.category !== 'Other Expenses') {
      return {
        category: aiPrediction.category,
        subcategory: aiPrediction.subcategory || ruleOutcome.subcategory,
        transactionType: ruleOutcome.transactionType,
        confidence: aiPrediction.confidence,
        source: 'ml'
      };
    }
  } catch {
    // Graceful fallback to rule-based outcome
  }

  return ruleOutcome;
}

