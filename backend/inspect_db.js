const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const users = await mongoose.connection.collection('users').find({}, { projection: { email: 1, name: 1 } }).toArray();
  console.log('Total users found:', users.length);

  for (const u of users) {
    const objIdTxs = await mongoose.connection.collection('transactions').countDocuments({ userId: u._id });
    const strIdTxs = await mongoose.connection.collection('transactions').countDocuments({ userId: u._id.toString() });
    console.log(`User: ${u.email} | ID: ${u._id} | Txs (ObjectId): ${objIdTxs} | Txs (String): ${strIdTxs}`);

    // If transactions exist, inspect months and types
    if (objIdTxs > 0 || strIdTxs > 0) {
      const matchCriteria = objIdTxs > 0 ? { userId: u._id } : { userId: u._id.toString() };
      const txs = await mongoose.connection.collection('transactions').find(matchCriteria).toArray();
      console.log(`  Sample transactions for ${u.email}: ${txs.length} total`);
      
      const byMonth = {};
      const byType = {};
      for (const t of txs) {
        const d = new Date(t.date);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[mKey] = (byMonth[mKey] || 0) + 1;
        const tKey = `${t.type || 'none'}/${t.transactionType || 'none'}`;
        byType[tKey] = (byType[tKey] || 0) + 1;
      }
      console.log('  Transactions by month:', JSON.stringify(byMonth));
      console.log('  Transactions by type/transactionType:', JSON.stringify(byType));

      // Test aggregation with ObjectId vs String
      const aggWithObjectId = await mongoose.connection.collection('transactions').aggregate([
        {
          $match: {
            userId: u._id,
            type: 'expense',
            transactionType: { $ne: 'transfer' }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).toArray();

      const aggWithString = await mongoose.connection.collection('transactions').aggregate([
        {
          $match: {
            userId: u._id.toString(),
            type: 'expense',
            transactionType: { $ne: 'transfer' }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).toArray();

      console.log(`  Aggregation with ObjectId: ${aggWithObjectId.length} months returned:`, JSON.stringify(aggWithObjectId));
      console.log(`  Aggregation with String: ${aggWithString.length} months returned:`, JSON.stringify(aggWithString));
    }
  }

  // Also check statement imports collection
  const imports = await mongoose.connection.collection('statementimports').find({}).toArray();
  console.log(`\nStatement imports found: ${imports.length}`);
  for (const imp of imports) {
    console.log(`  Import ${imp._id}: user=${imp.userId} (${typeof imp.userId}), status=${imp.status}, filename=${imp.filename || imp.originalFilename}, total=${imp.totalCount}, imported=${imp.importedCount}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
