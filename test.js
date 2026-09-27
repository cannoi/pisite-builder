const assert = require('assert');
const http = require('http');

const PORT = process.env.PORT || 8080;

console.log('Starting automated test check...');

setTimeout(() => {
  http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(json.status, 'ok');
        console.log('✅ Health check test passed successfully!');
        process.exit(0);
      } catch (err) {
        console.error('❌ Test failed parsing health response:', err);
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Test failed connecting to server:', err.message);
    process.exit(1);
  });
}, 1500);
