const test = require('node:test');
const assert = require('assert');
const ApiClient = require('./apiClient');

// Helper to create successful Response mock
function createResponse(body = '{}', options = {}) {
  return {
    ok: options.ok !== undefined ? options.ok : true,
    status: options.status || 200,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

test('applies base URL and headers', async () => {
  let calledUrl;
  let calledHeaders;
  const fetchMock = async (url, opts) => {
    calledUrl = url;
    calledHeaders = opts.headers;
    return createResponse();
  };
  const client = new ApiClient({
    baseUrl: 'https://example.com/api',
    headers: { Authorization: 'token' },
    fetchFn: fetchMock,
  });
  await client.request('/path', { headers: { 'X-Test': '1' } });
  assert.strictEqual(calledUrl, 'https://example.com/api/path');
  assert.strictEqual(calledHeaders.Authorization, 'token');
  assert.strictEqual(calledHeaders['X-Test'], '1');
});

test('retries failed requests', async () => {
  let attempts = 0;
  const fetchMock = async () => {
    attempts++;
    if (attempts < 3) throw new Error('fetch failed');
    return createResponse();
  };
  const client = new ApiClient({ retries: 2, fetchFn: fetchMock });
  await client.request('https://example.com');
  assert.strictEqual(attempts, 3);
});

test('translates network errors', async () => {
  const fetchMock = async () => {
    throw new Error('fetch failed');
  };
  const client = new ApiClient({ fetchFn: fetchMock });
  await assert.rejects(client.request('https://example.com'), err => err.message === 'Network error');
});

test('throws on HTTP errors with status', async () => {
  const fetchMock = async () => createResponse('oops', { ok: false, status: 500 });
  const client = new ApiClient({ fetchFn: fetchMock });
  await assert.rejects(
    client.request('https://example.com'),
    err => err.message.includes('500') && err.message.includes('oops')
  );
});