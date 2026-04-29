const test = require('node:test');
const assert = require('node:assert');

// Mock environment variables
process.env.AIRTABLE_API_KEY = 'test_key';
process.env.AIRTABLE_BASE_ID = 'test_base';

const captureLead = require('../../api/capture-lead.js');

// Helper to create mock req and res objects
function createMocks(options = {}) {
    const req = {
        method: options.method || 'POST',
        body: options.body || {}
    };

    const res = {
        _status: 200,
        _json: null,
        _headers: {},
        setHeader(key, value) {
            this._headers[key] = value;
        },
        status(code) {
            this._status = code;
            return this;
        },
        json(data) {
            this._json = data;
            return this;
        },
        end() {
            return this;
        }
    };

    return { req, res };
}

test('capture-lead API', async (t) => {

    await t.test('returns 200 and ends for OPTIONS requests', async () => {
        const { req, res } = createMocks({ method: 'OPTIONS' });
        await captureLead(req, res);
        assert.strictEqual(res._status, 200);
        assert.strictEqual(res._json, null);
    });

    await t.test('returns 405 for non-POST/OPTIONS requests', async () => {
        const { req, res } = createMocks({ method: 'GET' });
        await captureLead(req, res);
        assert.strictEqual(res._status, 405);
        assert.deepStrictEqual(res._json, { error: 'Method not allowed' });
    });

    await t.test('returns 400 if email is missing', async () => {
        const { req, res } = createMocks({ method: 'POST', body: {} });
        await captureLead(req, res);
        assert.strictEqual(res._status, 400);
        assert.deepStrictEqual(res._json, { error: 'Email is required' });
    });

    await t.test('returns user-friendly error for 404', async () => {
        const { req, res } = createMocks({ method: 'POST', body: { email: 'test@example.com' } });
        
        // Mock global fetch for 404
        global.fetch = async () => ({
            ok: false,
            status: 404,
            json: async () => ({ error: { message: 'Not found' } })
        });

        await captureLead(req, res);
        assert.strictEqual(res._status, 404);
        assert.ok(res._json.error.includes('Airtable Table Not Found'));
    });

    await t.test('returns user-friendly error for 422', async () => {
        const { req, res } = createMocks({ method: 'POST', body: { email: 'test@example.com' } });
        
        // Mock global fetch for 422
        global.fetch = async () => ({
            ok: false,
            status: 422,
            json: async () => ({ error: { message: 'Invalid request' } })
        });

        await captureLead(req, res);
        assert.strictEqual(res._status, 422);
        assert.ok(res._json.error.includes('Airtable Field Mismatch'));
    });

    await t.test('returns user-friendly error for 401', async () => {
        const { req, res } = createMocks({ method: 'POST', body: { email: 'test@example.com' } });
        
        // Mock global fetch for 401
        global.fetch = async () => ({
            ok: false,
            status: 401,
            json: async () => ({ error: { message: 'Unauthorized' } })
        });

        await captureLead(req, res);
        assert.strictEqual(res._status, 401);
        assert.ok(res._json.error.includes('Airtable Authentication Failed'));
    });

    await t.test('returns 200 for successful lead capture', async () => {
        const { req, res } = createMocks({ method: 'POST', body: { email: 'test@example.com' } });
        
        // Mock global fetch for success
        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ records: [{ id: 'rec123456789' }] })
        });

        await captureLead(req, res);
        assert.strictEqual(res._status, 200);
        assert.deepStrictEqual(res._json, { success: true, id: 'rec123456789' });
    });

    await t.test('returns 500 on internal server error', async () => {
        const { req, res } = createMocks({ method: 'POST', body: { email: 'test@example.com' } });
        
        // Mock global fetch to throw error
        global.fetch = async () => { throw new Error('Network error'); };

        // Hide console.error for this test
        const originalError = console.error;
        console.error = () => {};
        
        await captureLead(req, res);
        
        console.error = originalError;
        
        assert.strictEqual(res._status, 500);
        assert.deepStrictEqual(res._json, { error: 'Internal server error' });
    });
});
