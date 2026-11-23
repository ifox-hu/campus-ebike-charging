import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dashboardRange,
  inDashboardRange,
  dashboardRangeForSource,
} from '../src/domain/dashboardPeriod.js';
import { feeTrend } from '../src/domain/statistics.js';
import { overviewMetrics } from '../src/domain/operations.js';

test('仪表盘快捷区间包含结束日，跨月、跨年和闰年计算正确', () => {
  assert.deepEqual(dashboardRange('today', '2026-11-23'), {
    start: '2026-11-23',
    end: '2026-11-23',
  });
  assert.deepEqual(dashboardRange('week', '2026-11-23'), {
    start: '2026-11-17',
    end: '2026-11-23',
  });
  assert.deepEqual(dashboardRange('month', '2024-03-01'), {
    start: '2024-02-01',
    end: '2024-03-01',
  });
  assert.deepEqual(dashboardRange('week', '2026-01-03'), {
    start: '2025-12-28',
    end: '2026-01-03',
  });
  assert.equal(dashboardRange('all', '2026-11-23'), null);
  assert.throws(
    () => dashboardRange('custom', '2026-11-23', { start: '2026-11-23', end: '2026-11-20' }),
    /日期/,
  );
  assert.throws(
    () => dashboardRange('custom', '2026-11-23', { start: '2026-02-30', end: '2026-03-02' }),
    /日期/,
  );
});
test('日期筛选保留结束日，订单与结算按各自业务日期统计，设备数量不受影响', () => {
  const range = dashboardRange('custom', '2026-11-23', { start: '2026-11-20', end: '2026-11-21' });
  assert.equal(inDashboardRange('2026-11-21 23:59:59', range), true);
  assert.equal(inDashboardRange('2026-11-22 00:00:00', range), false);
  const orders = [
    {
      id: 1,
      stationId: 'A',
      status: 'ended',
      startedAt: '2026-11-20 23:00:00',
      endedAt: '2026-11-21 01:00:00',
      total: 2,
      energy: 1,
      electricFee: 1.8,
      serviceFee: 0.2,
    },
    { id: 2, stationId: 'A', status: 'charging', startedAt: '2026-11-22 00:00:00' },
  ];
  const source = {
    stations: [{ id: 'A', enabled: true }],
    devices: [],
    sockets: [],
    reports: [],
    orders,
    users: [],
  };
  assert.equal(overviewMetrics(source, range).orders, 1);
  assert.equal(overviewMetrics(source, null).orders, 2);
  assert.deepEqual(feeTrend(orders, range).series[0].data, [0, 1.8]);
  assert.deepEqual(dashboardRangeForSource(source, null, '2026-11-23'), {
    start: '2026-11-20',
    end: '2026-11-23',
    all: true,
  });
});
