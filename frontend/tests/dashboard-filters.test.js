import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeDashboardSource, buildDashboardView } from '../src/domain/dashboardView.js';
import { operationsStats } from '../src/domain/operations.js';
import { orderTrend } from '../src/domain/statistics.js';

const source = {
  stations: [
    { id: 'A', operatorId: 'campus', enabled: true },
    { id: 'B', operatorId: 'hospital', enabled: true },
  ],
  devices: [
    { id: 'D1', stationId: 'A', enabled: true, online: true },
    { id: 'D2', stationId: 'B', enabled: true, online: true },
  ],
  sockets: [
    { id: 'S1', deviceId: 'D1', enabled: true },
    { id: 'S2', deviceId: 'D2', enabled: true },
  ],
  orders: [
    {
      id: 'O1',
      operatorId: 'campus',
      stationId: 'B',
      status: 'ended',
      startedAt: '2026-11-20 09:00:00',
      total: 1,
      energy: 1,
      userId: 'U1',
    },
    {
      id: 'O2',
      stationId: 'B',
      status: 'charging',
      startedAt: '2026-11-21 09:00:00',
      userId: 'U2',
    },
  ],
  users: [
    { id: 'U1', createdAt: '2026-11-20' },
    { id: 'U2', createdAt: '2026-11-21' },
  ],
  reports: [{ id: 'R1', socketId: 'S1', status: 'pending' }],
  rows: [],
  rates: [],
};

test('仪表盘筛选联动资源和关联用户，历史订单按归档运营商筛选', () => {
  const scoped = scopeDashboardSource(source, 'campus');
  assert.deepEqual(
    scoped.stations.map((row) => row.id),
    ['A'],
  );
  assert.deepEqual(
    scoped.orders.map((row) => row.id),
    ['O1'],
  );
  assert.deepEqual(
    scoped.users.map((row) => row.id),
    ['U1'],
  );
  assert.deepEqual(
    scoped.reports.map((row) => row.id),
    ['R1'],
  );
  assert.equal(buildDashboardView(source, 'hospital').devices[0].free, 1);
  assert.equal(scopeDashboardSource(source, 'empty').devices.length, 0);
  assert.equal(source.stations.length, 2);
});

test('订单趋势按明确日期区间生成每日数据，空天补零并包含结束日期', () => {
  const trend = orderTrend(source.orders, { start: '2026-11-19', end: '2026-11-21' });
  assert.deepEqual(trend.xAxis.data, ['11-19', '11-20', '11-21']);
  assert.deepEqual(trend.series[0].data, [0, 1, 1]);
  assert.deepEqual(trend.series[1].data, [0, 1, 0]);
  assert.deepEqual(trend.series[2].data, [0, 0, 1]);
  assert.throws(() => orderTrend([], { start: '2026-11-22', end: '2026-11-20' }), /日期/);
  assert.throws(() => orderTrend([], { start: '2026-02-31', end: '2026-03-05' }), /日期/);
  assert.ok(orderTrend([], true).xAxis.data.length > 0);
});

test('后端数字运营商ID可用下拉选项字符串筛选，历史汇总保留归档订单', () => {
  const numeric = {
    ...source,
    stations: [
      { id: 'A', operatorId: 1 },
      { id: 'B', operatorId: 2 },
    ],
  };
  assert.equal(scopeDashboardSource(numeric, '1').stations.length, 1);
  const scoped = scopeDashboardSource(source, 'campus');
  assert.equal(operationsStats(scoped).orders, 1);
});
