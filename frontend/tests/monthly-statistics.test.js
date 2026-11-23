import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardRange } from '../src/domain/dashboardPeriod.js';
import { orderTrend, userTrend, feeTrend } from '../src/domain/statistics.js';
import { createSeed } from '../src/domain/seed.js';
import * as history from '../src/domain/demoHistory.js';
import { addOperatorOwnership } from '../src/domain/operatorDemo.js';
import { scopeDashboardSource } from '../src/domain/dashboardView.js';

test('近六个月从首月第一天到今天，跨年和月末不溢出', () => {
  assert.deepEqual(dashboardRange('sixMonths', '2026-11-23'), {
    start: '2026-06-01',
    end: '2026-11-23',
    granularity: 'month',
  });
  assert.deepEqual(dashboardRange('sixMonths', '2026-03-31'), {
    start: '2025-10-01',
    end: '2026-03-31',
    granularity: 'month',
  });
});
test('三张趋势按月份顺序汇总，空月补零且不包含区间外记录', () => {
  const range = { start: '2025-12-15', end: '2026-03-20', granularity: 'month' };
  const orders = [
    {
      status: 'ended',
      startedAt: '2025-12-10',
      endedAt: '2025-12-10',
      electricFee: 99,
      serviceFee: 9,
    },
    {
      status: 'ended',
      startedAt: '2025-12-31',
      endedAt: '2026-01-01',
      electricFee: 2,
      serviceFee: 0.2,
    },
    {
      status: 'ended',
      startedAt: '2026-01-05',
      endedAt: '2026-01-05',
      electricFee: 3,
      serviceFee: 0.3,
    },
    { status: 'charging', startedAt: '2026-03-20', electricFee: 9, serviceFee: 1 },
    {
      status: 'ended',
      startedAt: '2026-03-21',
      endedAt: '2026-03-21',
      electricFee: 99,
      serviceFee: 9,
    },
  ];
  const trend = orderTrend(orders, range);
  assert.deepEqual(trend.xAxis.data, ['2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(trend.series[0].data, [1, 1, 0, 1]);
  assert.deepEqual(trend.series[1].data, [1, 1, 0, 0]);
  assert.deepEqual(
    userTrend(
      [{ createdAt: '2025-12-01' }, { createdAt: '2026-01-02' }, { createdAt: '2026-03-20' }],
      range,
    ).series[0].data,
    [0, 1, 0, 1],
  );
  assert.deepEqual(
    feeTrend(orders, range).series.map((s) => s.data),
    [
      [0, 5, 0, 0],
      [0, 0.5, 0, 0],
    ],
  );
});
test('旧演示数据补齐近六个月，各运营商均有订单、用户和费用且重复加载不重复添加', () => {
  const original = createSeed(),
    before = JSON.stringify(original);
  const data = history.ensureDemoHistory(original, '2026-11-23');
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(history.ensureDemoHistory(data, '2026-11-23'), data);
  assert.ok(
    original.orders.every((o) => data.orders.some((n) => JSON.stringify(o) === JSON.stringify(n))),
  );
  const owned = addOperatorOwnership(data),
    range = dashboardRange('sixMonths', '2026-11-23');
  for (const id of new Set(owned.stations.map((s) => s.operatorId))) {
    const scoped = scopeDashboardSource(owned, id);
    assert.ok(
      orderTrend(scoped.orders, range).series[0].data.every((n) => n > 0),
      String(id),
    );
    assert.ok(
      userTrend(scoped.users, range).series[0].data.every((n) => n > 0),
      String(id),
    );
    assert.ok(
      feeTrend(scoped.orders, range).series.every((s) => s.data.every((n) => n > 0)),
      String(id),
    );
  }
  const next = history.ensureDemoHistory(data, '2026-12-03');
  assert.ok(next.orders.length > data.orders.length);
  assert.equal(new Set(next.orders.map((o) => o.id)).size, next.orders.length);
  assert.ok(
    next.orders
      .filter((o) => o.id.startsWith('HIST-'))
      .every((o) => o.startedAt.slice(0, 10) <= '2026-12-03'),
  );
});
