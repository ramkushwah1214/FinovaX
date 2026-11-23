const mongoose = require('mongoose');

async function auditIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  const collections = ['transactions', 'budgets', 'fraudalerts', 'statementimports', 'users'];
  for (const collName of collections) {
    try {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`\n================== Collection: ${collName} Indexes ==================`);
      indexes.forEach(idx => {
        console.log(`- Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}, Unique: ${Boolean(idx.unique)}, Sparse: ${Boolean(idx.sparse)}`);
      });
    } catch (e) {
      console.log(`Could not get indexes for ${collName}: ${e.message}`);
    }
  }

  // Find a real userId from database to run explain on real queries
  const user = await db.collection('users').findOne({});
  if (!user) {
    console.log('No user found for explain executionStats');
    await mongoose.disconnect();
    return;
  }
  const userId = user._id;
  console.log(`\nRunning explain executionStats with sample userId: ${userId}`);

  const txColl = db.collection('transactions');

  // Query 1: Pagination by date descending
  console.log('\n--- 1. Explain: Transactions list (userId + date desc) ---');
  const exp1 = await txColl.find({ userId }).sort({ date: -1, _id: -1 }).limit(20).explain('executionStats');
  console.log(`Stage: ${exp1.executionStats.executionStages.stage}, TotalDocsExamined: ${exp1.executionStats.totalDocsExamined}, NReturned: ${exp1.executionStats.nReturned}`);
  console.log(`Index used: ${exp1.queryPlanner.winningPlan.inputStage ? (exp1.queryPlanner.winningPlan.inputStage.indexName || exp1.queryPlanner.winningPlan.inputStage.stage) : exp1.queryPlanner.winningPlan.stage}`);

  // Query 2: ReferenceId lookup
  console.log('\n--- 2. Explain: ReferenceId lookup ---');
  const exp2 = await txColl.find({ userId, referenceId: 'TEST_REF_123' }).explain('executionStats');
  console.log(`Stage: ${exp2.executionStats.executionStages.stage}, TotalDocsExamined: ${exp2.executionStats.totalDocsExamined}`);
  console.log(`Index used: ${exp2.queryPlanner.winningPlan.inputStage ? (exp2.queryPlanner.winningPlan.inputStage.indexName || exp2.queryPlanner.winningPlan.inputStage.stage) : exp2.queryPlanner.winningPlan.stage}`);

  // Query 3: Date range + type (Expense breakdown)
  console.log('\n--- 3. Explain: Date range + type ---');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const exp3 = await txColl.find({ userId, type: 'expense', date: { $gte: start, $lte: end } }).explain('executionStats');
  console.log(`Stage: ${exp3.executionStats.executionStages.stage}, TotalDocsExamined: ${exp3.executionStats.totalDocsExamined}`);
  console.log(`Index used: ${exp3.queryPlanner.winningPlan.inputStage ? (exp3.queryPlanner.winningPlan.inputStage.indexName || exp3.queryPlanner.winningPlan.inputStage.stage) : exp3.queryPlanner.winningPlan.stage}`);

  // Query 4: ImportBatchId lookup
  console.log('\n--- 4. Explain: ImportBatchId lookup ---');
  const exp4 = await txColl.find({ userId, importBatchId: new mongoose.Types.ObjectId() }).explain('executionStats');
  console.log(`Stage: ${exp4.executionStats.executionStages.stage}, TotalDocsExamined: ${exp4.executionStats.totalDocsExamined}`);
  console.log(`Index used: ${exp4.queryPlanner.winningPlan.inputStage ? (exp4.queryPlanner.winningPlan.inputStage.indexName || exp4.queryPlanner.winningPlan.inputStage.stage) : exp4.queryPlanner.winningPlan.stage}`);

  // Query 5: Budget lookup
  console.log('\n--- 5. Explain: Budget lookup ---');
  const budgetColl = db.collection('budgets');
  const exp5 = await budgetColl.find({ userId, month: 8, year: 2026 }).explain('executionStats');
  console.log(`Stage: ${exp5.executionStats.executionStages.stage}, TotalDocsExamined: ${exp5.executionStats.totalDocsExamined}`);
  console.log(`Index used: ${exp5.queryPlanner.winningPlan.inputStage ? (exp5.queryPlanner.winningPlan.inputStage.indexName || exp5.queryPlanner.winningPlan.inputStage.stage) : exp5.queryPlanner.winningPlan.stage}`);

  // Query 6: FraudAlert pending review
  console.log('\n--- 6. Explain: FraudAlert lookup ---');
  const fraudColl = db.collection('fraudalerts');
  const exp6 = await fraudColl.find({ userId, status: 'pending_review' }).explain('executionStats');
  console.log(`Stage: ${exp6.executionStats.executionStages.stage}, TotalDocsExamined: ${exp6.executionStats.totalDocsExamined}`);
  console.log(`Index used: ${exp6.queryPlanner.winningPlan.inputStage ? (exp6.queryPlanner.winningPlan.inputStage.indexName || exp6.queryPlanner.winningPlan.inputStage.stage) : exp6.queryPlanner.winningPlan.stage}`);

  await mongoose.disconnect();
}

auditIndexes().catch(console.error);
