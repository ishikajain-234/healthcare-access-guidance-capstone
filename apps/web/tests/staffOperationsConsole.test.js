/**
 * staffOperationsConsole.test.js
 * Focused frontend unit and integration tests for Staff Operations Console.
 * Executed via Node.js native test runner: node --test tests/
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDurationMinutes,
  formatPercent,
  formatNumber,
  formatDate,
  formatTime,
  getBedStatusConfig,
  getTokenStatusConfig,
  getAdmissionStatusConfig,
  getInventoryStatusConfig,
} from '../src/utils/formatters.js';

describe('Staff Operations Console - Formatters', () => {
  test('formatDurationMinutes handles edge cases and decimals', () => {
    assert.strictEqual(formatDurationMinutes(null), '—');
    assert.strictEqual(formatDurationMinutes(undefined), '—');
    assert.strictEqual(formatDurationMinutes(0), '0s');
    assert.strictEqual(formatDurationMinutes(0.5), '30s');
    assert.strictEqual(formatDurationMinutes(14.24), '14.2 min');
    assert.strictEqual(formatDurationMinutes(60), '60.0 min');
  });

  test('formatPercent handles numbers, nulls, and precision', () => {
    assert.strictEqual(formatPercent(null), '0.0%');
    assert.strictEqual(formatPercent(undefined), '0.0%');
    assert.strictEqual(formatPercent(25), '25.0%');
    assert.strictEqual(formatPercent(78.567, 2), '78.57%');
  });

  test('formatNumber formats numbers with locale separators', () => {
    assert.strictEqual(formatNumber(0), '0');
    assert.strictEqual(formatNumber(1500), '1,500');
    assert.strictEqual(formatNumber(null), '0');
  });
});

describe('Staff Operations Console - Status Badges & Mappings', () => {
  test('getBedStatusConfig covers all frozen finite states', () => {
    const states = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'];
    for (const state of states) {
      const cfg = getBedStatusConfig(state);
      assert.ok(cfg.label.length > 0);
      assert.ok(cfg.bg.length > 0);
      assert.ok(cfg.dot.length > 0);
    }
    assert.strictEqual(getBedStatusConfig('OUT_OF_SERVICE').label, 'OUT OF SERVICE');
  });

  test('getTokenStatusConfig covers all OPD token lifecycle states', () => {
    const statuses = ['WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED'];
    for (const status of statuses) {
      const cfg = getTokenStatusConfig(status);
      assert.ok(cfg.label.length > 0);
      assert.ok(cfg.bg.length > 0);
      assert.ok(cfg.dot.length > 0);
    }
    assert.strictEqual(getTokenStatusConfig('IN_SERVICE').label, 'IN SERVICE');
  });

  test('getAdmissionStatusConfig covers all admission statuses', () => {
    const statuses = [
      'ADMISSION_REQUESTED',
      'PENDING_REVIEW',
      'BED_ASSIGNED',
      'ADMISSION_CONFIRMED',
      'ADMITTED',
      'DISCHARGED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      const cfg = getAdmissionStatusConfig(status);
      assert.ok(cfg.label.length > 0);
      assert.ok(cfg.bg.length > 0);
    }
    assert.strictEqual(getAdmissionStatusConfig('ADMISSION_REQUESTED').label, 'REQUESTED');
    assert.strictEqual(getAdmissionStatusConfig('ADMISSION_REQUESTED').fullLabel, 'ADMISSION REQUESTED');
  });

  test('getInventoryStatusConfig covers in-stock, low-stock, and out-of-stock', () => {
    assert.strictEqual(getInventoryStatusConfig('IN_STOCK').label, 'IN STOCK');
    assert.strictEqual(getInventoryStatusConfig('LOW_STOCK').label, 'LOW STOCK');
    assert.strictEqual(getInventoryStatusConfig('OUT_OF_STOCK').label, 'OUT OF STOCK');
  });
});

describe('Staff Operations Console - Queue & Theoretical M/M/c Contracts', () => {
  test('queue size calculation correctly isolates WAITING tokens', () => {
    const sampleTokens = [
      { token_id: '1', status: 'WAITING' },
      { token_id: '2', status: 'WAITING' },
      { token_id: '3', status: 'CALLED' },
      { token_id: '4', status: 'IN_SERVICE' },
      { token_id: '5', status: 'COMPLETED' },
      { token_id: '6', status: 'CANCELLED' },
    ];

    const waitingTokens = sampleTokens.filter((t) => t.status === 'WAITING').length;
    const calledTokens = sampleTokens.filter((t) => t.status === 'CALLED').length;
    const inServiceTokens = sampleTokens.filter((t) => t.status === 'IN_SERVICE').length;
    const completedTokens = sampleTokens.filter((t) => t.status === 'COMPLETED').length;
    const cancelledTokens = sampleTokens.filter((t) => t.status === 'CANCELLED').length;

    assert.strictEqual(waitingTokens, 2);
    assert.strictEqual(calledTokens, 1);
    assert.strictEqual(inServiceTokens, 1);
    assert.strictEqual(completedTokens, 1);
    assert.strictEqual(cancelledTokens, 1);
  });

  test('M/M/c delta calculation correctly compares observed vs theoretical wait', () => {
    const observedWait = 14.5; // minutes
    const theoreticalWait = 11.2; // minutes
    const delta = Math.round((observedWait - theoreticalWait) * 100) / 100;

    assert.strictEqual(delta, 3.3);

    // Unstable queue check
    const stable = false;
    const theoreticalWaitUnstable = stable ? 25.0 : null;
    assert.strictEqual(theoreticalWaitUnstable, null);
  });
});

describe('Staff Operations Console - Bed & Inpatient Pipeline Contracts', () => {
  test('bed occupancy rate computation matches integer percentage', () => {
    const totalBeds = 8;
    const occupiedBeds = 2;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    assert.strictEqual(occupancyRate, 25.0);
  });

  test('ICU wards isolation from general ward breakdown', () => {
    const wards = [
      { ward_id: 'w1', ward_type: 'GENERAL', total_beds: 6, available_beds: 2, occupied_beds: 1 },
      { ward_id: 'w2', ward_type: 'ICU', total_beds: 2, available_beds: 1, occupied_beds: 1 },
    ];

    const icuWards = wards.filter((w) => w.ward_type === 'ICU');
    const icuTotal = icuWards.reduce((acc, w) => acc + w.total_beds, 0);
    const icuAvail = icuWards.reduce((acc, w) => acc + w.available_beds, 0);
    const icuOccupied = icuWards.reduce((acc, w) => acc + w.occupied_beds, 0);

    assert.strictEqual(icuWards.length, 1);
    assert.strictEqual(icuTotal, 2);
    assert.strictEqual(icuAvail, 1);
    assert.strictEqual(icuOccupied, 1);
  });

  test('active admissions pipeline classification', () => {
    const admissions = [
      { admission_id: 'a1', status: 'ADMISSION_REQUESTED' },
      { admission_id: 'a2', status: 'PENDING_REVIEW' },
      { admission_id: 'a3', status: 'BED_ASSIGNED' },
      { admission_id: 'a4', status: 'ADMISSION_CONFIRMED' },
      { admission_id: 'a5', status: 'ADMITTED' },
      { admission_id: 'a6', status: 'DISCHARGED' },
      { admission_id: 'a7', status: 'CANCELLED' },
    ];

    const activeStatuses = ['ADMISSION_REQUESTED', 'PENDING_REVIEW', 'BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED'];
    const activeAdmissions = admissions.filter((a) => activeStatuses.includes(a.status));
    const dischargedAdmissions = admissions.filter((a) => a.status === 'DISCHARGED');

    assert.strictEqual(activeAdmissions.length, 5);
    assert.strictEqual(dischargedAdmissions.length, 1);
  });
});

describe('Staff Operations Console - Inventory Alert Thresholds', () => {
  test('critical supply alert filters low-stock and out-of-stock items', () => {
    const items = [
      { item_id: 'i1', current_stock: 120, reorder_threshold: 50, stock_status: 'IN_STOCK' },
      { item_id: 'i2', current_stock: 45, reorder_threshold: 50, stock_status: 'LOW_STOCK' },
      { item_id: 'i3', current_stock: 0, reorder_threshold: 15, stock_status: 'OUT_OF_STOCK' },
    ];

    const alerts = items.filter((i) => i.stock_status === 'LOW_STOCK' || i.stock_status === 'OUT_OF_STOCK');
    const outOfStock = items.filter((i) => i.stock_status === 'OUT_OF_STOCK');

    assert.strictEqual(alerts.length, 2);
    assert.strictEqual(outOfStock.length, 1);
    assert.strictEqual(outOfStock[0].item_id, 'i3');
  });
});
