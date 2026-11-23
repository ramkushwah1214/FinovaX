const http = require('http');

const data = JSON.stringify({
  name: 'Probe Test Account',
  email: `probe_${Date.now()}@finovax.test`,
  password: 'Password123!',
  currency: 'INR',
  monthlyIncome: 65000
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Registration HTTP Status:', res.statusCode);
    console.log('Registration Response:', body);
    process.exit(res.statusCode === 201 || res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err.message);
  process.exit(1);
});

req.write(data);
req.end();
