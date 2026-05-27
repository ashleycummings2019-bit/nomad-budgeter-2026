import test from 'node:test';
import assert from 'node:assert';
import { getTaxRate, calculateNetIncome } from '../src/js/modules/tax-engine.js';

test('Tax Engine - getTaxRate', async (t) => {
    await t.test('Spain (Beckham Law) - low income', () => {
        assert.strictEqual(getTaxRate('Spain', 50000).rate, 0.24);
    });

    await t.test('Spain (Beckham Law) - high income', () => {
        assert.strictEqual(getTaxRate('Spain', 700000).rate, 0.47);
    });

    await t.test('UAE - zero tax', () => {
        assert.strictEqual(getTaxRate('UAE', 100000).rate, 0.00);
    });

    await t.test('Portugal - fixed rate', () => {
        assert.strictEqual(getTaxRate('Portugal', 100000).rate, 0.20);
    });

    await t.test('United States - progressive brackets', () => {
        assert.strictEqual(getTaxRate('United States', 50000).rate, 0.1412955);
        assert.strictEqual(getTaxRate('United States', 150000).rate, 0.145630725);
        assert.strictEqual(getTaxRate('United States', 250000).rate, 0.228800995);
    });

    await t.test('Fallback for unknown country', () => {
        assert.strictEqual(getTaxRate('Unknownia', 100000).rate, 0.25);
    });
});

test('Tax Engine - calculateNetIncome', async (t) => {
    await t.test('Calculation correctness for Greece', () => {
        const result = calculateNetIncome(100000, 'Greece');
        assert.strictEqual(result.gross, 100000);
        assert.strictEqual(result.taxRate, 0.22);
        assert.strictEqual(result.taxAmount, 22000);
        assert.strictEqual(result.net, 78000);
        assert.strictEqual(result.monthlyNet, 78000 / 12);
    });
});
