const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const collections = [
  'transactions',
  'budgets',
  'financialgoals',
  'recurringpayments',
  'fraudalerts',
  'statementimports',
  'bankaccounts',
  'bankconnections',
  'consentrecords',
  'financialinsights',
  'spendingforecasts',
  'spendingsegments'
];

async function inspect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  // Connect with DNS timeout
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas');

  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log(`\nFound ${users.length} registered user(s):`);

  for (const user of users) {
    // Mask email for privacy (e.g. k***@gmail.com)
    const emailParts = (user.email || '').split('@');
    const maskedEmail = emailParts[0].slice(0, 2) + '***@' + (emailParts[1] || '');
    const maskedId = user._id.toString();

    console.log(`\n======================================================`);
    console.log(`User ID: ${maskedId}`);
    console.log(`Masked Email: ${maskedEmail}`);
    console.log(`Name: ${user.name}`);
    console.log(`Account Created: ${user.createdAt}`);
    console.log(`------------------------------------------------------`);

    let totalUserRecords = 0;
    const summary = {};

    for (const col of collections) {
      const count = await mongoose.connection.collection(col).countDocuments({
        userId: user._id
      });
      summary[col] = count;
      totalUserRecords += count;
    }

    console.log('Financial Collections Breakdown:');
    for (const [col, count] of Object.entries(summary)) {
      if (count > 0) {
        console.log(`  - ${col}: ${count} record(s)`);
      } else {
        console.log(`  - ${col}: 0`);
      }
    }
    console.log(`Total Financial Records for this User: ${totalUserRecords}`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Database inspection finished.');
}

inspect().catch(err => {
  console.error('Inspection failed:', err.message);
  process.exit(1);
});
