import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/domain/seed.js';
import {
  addOperatorOwnership,
  operatorDemoData,
  mergeOperatorDemoData,
} from '../src/domain/operatorDemo.js';
import {
  createDemoManagementClient,
  isDemoOperatorAcceptingOrders,
} from '../src/domain/managementDemo.js';
import { createService } from '../src/domain/service.js';

function fixture() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const source = addOperatorOwnership(createSeed());
  let user = { id: 'platform-admin', username: 'demo', role: 'ADMIN' };
  let changed = 0;
  const options = { getUser: () => user, getSource: () => source, onChanged: () => changed++ };
  return {
    client: createDemoManagementClient(options),
    source,
    values,
    options,
    login: (next) => {
      user = next;
    },
    changes: () => changed,
  };
}
const staff = {
  username: 'team_test',
  displayName: '演示运营员',
  password: 'DemoPass1234',
  role: 'OPERATOR',
};

test('报修分派与团队联动，过程可追溯且拒绝跨运营商处理', async () => {
  const f = fixture();
  await f.client.createTeam(staff, 'campus');
  const choices = await f.client.repairAssignees('R1');
  assert.ok(choices.some((row) => row.username === 'team_test'));
  assert.ok(!choices.some((row) => row.username === 'demo_hospital'));
  f.login({
    id: 'campus-admin',
    username: 'demo_campus',
    role: 'OPERATOR_ADMIN',
    operatorId: 'campus',
  });
  await f.client.handleRepair('R1', {
    status: 'PROCESSING',
    resolution: '安排现场检查',
    assigneeUsername: 'team_test',
  });
  const report = f.source.reports.find((row) => row.id === 'R1');
  assert.equal(report.status, 'processing');
  assert.equal(report.assigneeUsername, 'team_test');
  assert.equal(JSON.parse(report.progressHistory).length, 1);
  await assert.rejects(
    f.client.handleRepair('R1', {
      status: 'RESOLVED',
      resolution: '检查完成',
      assigneeUsername: 'demo_hospital',
    }),
  );
  f.login({
    id: 'hospital-admin',
    username: 'demo_hospital',
    role: 'OPERATOR_ADMIN',
    operatorId: 'hospital',
  });
  await assert.rejects(f.client.repairAssignees('R1'));
  assert.equal(report.status, 'processing');
});

test('运营商管理员可保留原平台负责人继续处理，但不能新分派给其他运营商', async () => {
  const f = fixture();
  await f.client.handleRepair('R1', { status: 'PROCESSING', resolution: '平台已受理' });
  f.login({ username: 'demo_campus', role: 'OPERATOR_ADMIN', operatorId: 'campus' });
  await assert.rejects(
    f.client.handleRepair('R1', {
      status: 'RESOLVED',
      resolution: '检查完成',
      assigneeUsername: 'demo_hospital',
    }),
  );
  await f.client.handleRepair('R1', {
    status: 'RESOLVED',
    resolution: '检查完成',
    assigneeUsername: 'demo',
  });
  assert.equal(f.source.reports.find((row) => row.id === 'R1').status, 'resolved');
  assert.equal(f.source.reports.find((row) => row.id === 'R1').assigneeUsername, 'demo');
});

test('demo operator edits, team records and sanitized audit survive adapter reconstruction', async () => {
  const f = fixture(),
    api = f.client;
  const baseline = (await api.audit()).total;
  const created = await api.createOperator({ name: '测试运营商', cooperationStatus: '洽谈中' });
  assert.equal(created.cooperationStatus, '洽谈中');
  await api.updateOperator(created.id, {
    contactName: '测试联系人',
    phone: '示例联系方式',
    enabled: true,
  });
  await api.assignStation('ST03', created.id);
  const member = await api.createTeam(staff, created.id);
  await api.setTeamEnabled(member.id, false, created.id);
  await api.resetTeamPassword(member.id, 'NextPassword123', created.id);
  await api.recordOperation({
    action: '测试脱敏',
    afterValue: { password: 'NeverLeak123', nested: { accessToken: 'hidden' } },
  });
  const restored = createDemoManagementClient(f.options);
  assert.equal(
    (await restored.operators()).find((row) => row.id === created.id).contactName,
    '测试联系人',
  );
  assert.equal((await restored.team(created.id))[0].enabled, false);
  assert.equal(f.source.stations.find((row) => row.id === 'ST03').operatorId, created.id);
  const audit = await restored.audit();
  assert.equal(audit.total, baseline + 7);
  assert.ok(!JSON.stringify([...f.values.values()]).includes('DemoPass1234'));
  assert.ok(!JSON.stringify([...f.values.values()]).includes('NextPassword123'));
  assert.ok(!JSON.stringify([...f.values.values()]).includes('NeverLeak123'));
  assert.ok(f.changes() >= 7);
});

test('operator service users and details never disclose other tenant order or repair records', async () => {
  const f = fixture();
  const campusStation = f.source.stations.find((row) => row.operatorId === 'campus');
  const hospitalStation = f.source.stations.find((row) => row.operatorId === 'hospital');
  const hospitalDevice = f.source.devices.find((row) => row.stationId === hospitalStation.id);
  const hospitalSocket = f.source.sockets.find((row) => row.deviceId === hospitalDevice.id);
  f.source.orders.push({
    id: 'hospital-only',
    userId: 'U10',
    stationId: hospitalStation.id,
    socketId: hospitalSocket.id,
    startedAt: '2026-11-10',
    total: 999,
  });
  f.login({
    id: 'campus-admin',
    username: 'demo_campus',
    role: 'OPERATOR_ADMIN',
    operatorId: 'campus',
  });
  const users = await f.client.serviceUsers();
  assert.ok(!users.rows.some((row) => row.id === 'U10'));
  await assert.rejects(f.client.serviceUser('U10'));
  await assert.rejects(f.client.serviceUsers({ operatorId: 'hospital' }));
  await assert.rejects(f.client.operatorStaff('hospital'));
  await assert.rejects(f.client.assignStation(campusStation.id, 'hospital'));
  const detail = await f.client.serviceUser(users.rows[0].id);
  assert.ok(
    detail.orders.every(
      (order) =>
        f.source.stations.find((row) => row.id === order.stationId).operatorId === 'campus',
    ),
  );
  assert.ok(detail.repairs.every((repair) => repair.socketId !== hospitalSocket.id));
  await assert.rejects(f.client.statistics({ stationId: hospitalStation.id }));
  await f.client.createTeam(staff);
  assert.equal((await f.client.team())[0].operatorId, 'campus');
  f.login({ username: 'reader', role: 'OPERATOR', operatorId: 'campus' });
  await assert.rejects(f.client.createTeam({ ...staff, username: 'other' }));
});

test('statistics aggregate actual seed amounts with date, owner and station filters', async () => {
  const f = fixture(),
    api = f.client;
  const result = await api.statistics({
    operatorId: 'campus',
    from: '2026-11-03',
    to: '2026-11-03',
  });
  const stationIds = new Set(
    f.source.stations.filter((row) => row.operatorId === 'campus').map((row) => row.id),
  );
  const orders = f.source.orders.filter(
    (row) => stationIds.has(row.stationId) && row.startedAt.startsWith('2026-11-03'),
  );
  assert.equal(result.summary.orderCount, orders.length);
  assert.equal(
    result.summary.totalAmount,
    Number(orders.reduce((sum, row) => sum + row.total, 0).toFixed(2)),
  );
  assert.equal(
    result.summary.paidAmount,
    Number(
      orders
        .filter((row) => row.payStatus === 'paid')
        .reduce((sum, row) => sum + row.total, 0)
        .toFixed(2),
    ),
  );
  assert.equal(result.daily.length, 1);
  assert.ok(result.rows.every((row) => row.operatorId === 'campus'));
  const single = await api.statistics({ stationId: result.rows[0].stationId });
  assert.equal(single.rows.length, 1);
  assert.equal(
    single.summary.deviceCount,
    f.source.devices.filter((row) => row.stationId === single.rows[0].stationId).length,
  );
  await assert.rejects(api.statistics({ from: '2026-11-09', to: '2026-11-01' }));
});

test('failed persistence rolls back operators, team changes, logs and station ownership', async () => {
  const f = fixture(),
    api = f.client;
  const member = await api.createTeam(staff, 'campus');
  const originalOperators = await api.operators(),
    originalTeam = await api.team(),
    originalAudit = await api.audit();
  const station = f.source.stations.find((row) => row.id === 'ST03');
  globalThis.localStorage.setItem = () => {
    throw Error('quota exceeded');
  };
  await assert.rejects(api.createOperator('不可保存的运营商'), /未能保存/);
  await assert.rejects(api.updateOperator('campus', { name: '不可保存的名称' }), /未能保存/);
  await assert.rejects(api.setTeamEnabled(member.id, false, 'campus'), /未能保存/);
  await assert.rejects(api.assignStation(station.id, 'hospital'), /未能保存/);
  assert.deepEqual(await api.operators(), originalOperators);
  assert.deepEqual(await api.team(), originalTeam);
  assert.deepEqual(await api.audit(), originalAudit);
  assert.equal(station.operatorId, 'campus');
  assert.equal(f.changes(), 1);
});

test('empty pagination, order-only user relationships and historical statistics follow management contract', async () => {
  const f = fixture(),
    api = f.client;
  assert.equal((await api.audit(1, { keyword: 'not-present' })).totalPages, 1);
  assert.equal((await api.serviceUsers({ keyword: 'not-present' })).totalPages, 1);
  const campusDevice = f.source.devices.find(
    (row) =>
      f.source.stations.find((station) => station.id === row.stationId).operatorId === 'campus',
  );
  const socket = f.source.sockets.find((row) => row.deviceId === campusDevice.id);
  f.source.reports.push({
    id: 'report-only',
    userId: 'U10',
    socketId: socket.id,
    status: 'pending',
  });
  const historical = {
    ...f.source.orders[0],
    id: 'archived-real',
    archived: true,
    testOrder: false,
    status: 'ended',
    total: 12.34,
  };
  const synthetic = { ...historical, id: 'test-only', testOrder: true, total: 999 };
  f.source.orders.push(historical, synthetic);
  const stats = await api.statistics();
  assert.equal(stats.summary.orderCount, f.source.orders.length - 1);
  assert.equal(
    stats.summary.totalAmount,
    Number(
      f.source.orders
        .filter((row) => row.testOrder !== true && row.status === 'ended')
        .reduce((sum, row) => sum + row.total, 0)
        .toFixed(2),
    ),
  );
  f.login({ username: 'demo_campus', role: 'OPERATOR_ADMIN', operatorId: 'campus' });
  assert.ok(!(await api.serviceUsers()).rows.some((row) => row.id === 'U10'));
  await assert.rejects(api.serviceUser('U10'));
});

test('tenant audit filters cannot disclose another tenant or platform-wide events', async () => {
  const f = fixture(),
    api = f.client;
  const baseline = (await api.audit(1, { operatorId: 'campus' })).total;
  await api.createTeam(staff, 'campus');
  await api.createTeam({ ...staff, username: 'hospital_team' }, 'hospital');
  await api.recordOperation({ action: '平台范围记录', afterValue: { phone: '' } });
  f.login({ username: 'demo_campus', role: 'OPERATOR_ADMIN', operatorId: 'campus' });
  const logs = await api.audit();
  assert.equal(logs.total, baseline + 1);
  assert.ok(logs.rows.every((row) => row.operatorId === 'campus'));
  await assert.rejects(api.audit(1, { operatorId: 'hospital' }));
  await assert.rejects(api.recordOperation({ action: '冒充其他运营商', operatorId: 'hospital' }));
  assert.equal((await api.audit()).total, baseline + 1);
});

test('sample audit migration persists once, preserves user logs and supports operator and date filters', async () => {
  const f = fixture(),
    api = f.client;
  const seeded = await api.audit();
  assert.equal(seeded.total, 9);
  assert.equal(new Set(seeded.rows.map((row) => row.id)).size, 9);
  assert.ok(seeded.rows.every((row) => row.action.includes('示例')));
  assert.ok(!/password|token|secret|credential/i.test(JSON.stringify(seeded.rows)));
  const key = [...f.values.keys()][0];
  const initial = JSON.parse(f.values.get(key));
  assert.equal(initial.auditSeedVersion, 1);
  const shanghaiToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  assert.equal(initial.auditSeedDate, shanghaiToday);
  await api.recordOperation({ action: '用户自己的操作', operatorId: 'campus' });
  const persisted = f.values.get(key);
  assert.deepEqual(await createDemoManagementClient(f.options).audit(), await api.audit());
  assert.equal(f.values.get(key), persisted);
  const old = JSON.parse(persisted);
  delete old.auditSeedVersion;
  delete old.auditSeedDate;
  old.logs = old.logs.filter((row) => !row.action.includes('示例')).concat(initial.logs[0]);
  f.values.set(key, JSON.stringify(old));
  const migrated = createDemoManagementClient(f.options);
  const logs = await migrated.audit();
  assert.equal(logs.total, 10);
  assert.equal(logs.rows.filter((row) => row.action === '用户自己的操作').length, 1);
  assert.equal(new Set(logs.rows.map((row) => row.id)).size, logs.total);
  for (const operatorId of ['campus', 'hospital', 'platform']) {
    const scoped = await migrated.audit(1, { operatorId });
    assert.ok(scoped.total > 0);
    assert.ok(scoped.rows.every((row) => row.operatorId === operatorId));
  }
  const today = await migrated.audit(1, { from: initial.auditSeedDate, to: initial.auditSeedDate });
  assert.ok(today.total > 0);
  assert.ok(today.rows.every((row) => row.createdAt.startsWith(initial.auditSeedDate)));
  assert.equal((await migrated.audit(1, { from: '2000-01-01', to: '2000-01-01' })).total, 0);
  const empty = JSON.parse(persisted);
  delete empty.auditSeedVersion;
  empty.logs = [];
  f.values.set(key, JSON.stringify(empty));
  assert.equal((await createDemoManagementClient(f.options).audit()).total, 9);
  const previousVisit = JSON.parse(f.values.get(key));
  previousVisit.auditSeedDate = '2026-01-03';
  for (const row of previousVisit.logs) row.createdAt = `2026-01-03${row.createdAt.slice(10)}`;
  f.values.set(key, JSON.stringify(previousVisit));
  const previousVisitStored = f.values.get(key);
  const laterVisit = createDemoManagementClient(f.options);
  assert.equal((await laterVisit.audit()).total, 9);
  assert.equal((await laterVisit.audit(1, { from: '2026-01-03', to: '2026-01-03' })).total, 9);
  assert.equal(f.values.get(key), previousVisitStored);
  f.login({ username: 'demo_hospital', role: 'OPERATOR_ADMIN', operatorId: 'hospital' });
  assert.ok((await laterVisit.audit()).rows.every((row) => row.operatorId === 'hospital'));
});

test('suspended and terminated demo cooperation blocks new orders while active orders can finish', async () => {
  const f = fixture(),
    api = f.client;
  const charging = createService(f.source, {
    canStartAtStation: (station) => isDemoOperatorAcceptingOrders(station.operatorId),
  });
  const existing = f.source.orders.find((row) => row.status === 'charging');
  const owner = f.source.stations.find((row) => row.id === existing.stationId).operatorId;
  const free = f.source.sockets.find((socket) => {
    const device = f.source.devices.find((row) => row.id === socket.deviceId);
    return (
      device.online &&
      device.enabled &&
      !socket.fault &&
      f.source.stations.find((row) => row.id === device.stationId).operatorId === owner &&
      !f.source.orders.some(
        (row) =>
          row.socketId === socket.id && ['starting', 'charging', 'abnormal'].includes(row.status),
      )
    );
  });
  const count = f.source.orders.length,
    sequence = f.source.sequence;
  await api.updateOperator(owner, { cooperationStatus: 'SUSPENDED', enabled: true });
  assert.equal(isDemoOperatorAcceptingOrders(owner), false);
  assert.throws(() => charging.requestStartSimulation(free.id, 'U1'), /暂停或终止合作/);
  assert.equal(f.source.orders.length, count);
  assert.equal(f.source.sequence, sequence);
  assert.equal(charging.endSimulation(existing.id).status, 'ended');
  await api.updateOperator(owner, { cooperationStatus: 'TERMINATED' });
  assert.throws(() => charging.startSimulation(free.id, 'U1'), /暂停或终止合作/);
  await api.updateOperator(owner, { cooperationStatus: 'ACTIVE', enabled: false });
  assert.throws(() => charging.startSimulation(free.id, 'U1'), /暂停或终止合作/);
  await api.updateOperator(owner, { cooperationStatus: 'ACTIVE', enabled: true });
  assert.equal(charging.startSimulation(free.id, 'U1').status, 'charging');
});

test('station service preserves contact phone and business hours across partial edits', () => {
  const f = fixture(),
    service = createService(f.source),
    station = f.source.stations[0];
  const body = { ...station, contactPhone: '演示电话', businessHours: '08:00–22:00' };
  service.saveStation(body, station.id);
  assert.equal(station.contactPhone, '演示电话');
  assert.equal(station.businessHours, '08:00–22:00');
  const partial = { ...station, name: '更新后的站点' };
  delete partial.contactPhone;
  delete partial.businessHours;
  service.saveStation(partial, station.id);
  assert.equal(station.contactPhone, '演示电话');
  assert.equal(station.businessHours, '08:00–22:00');
  assert.throws(
    () => service.saveStation({ ...station, businessHours: 'x'.repeat(101) }, station.id),
    /营业时间/,
  );
});

test('station transfer preserves old tenant history and rejects unresolved operational work', async () => {
  const f = fixture(),
    api = f.client;
  await assert.rejects(api.assignStation('ST01', 'hospital'), /未结束|未处理/);
  const station = f.source.stations.find((row) => row.id === 'ST01');
  for (const order of f.source.orders.filter((row) => row.stationId === station.id))
    order.status = 'ended';
  await assert.rejects(api.assignStation(station.id, 'hospital'), /未处理/);
  for (const report of f.source.reports) report.status = 'resolved';
  const oldOrders = f.source.orders.filter((row) => row.stationId === station.id);
  await api.assignStation(station.id, 'hospital');
  f.login({ username: 'demo_hospital', role: 'OPERATOR_ADMIN', operatorId: 'hospital' });
  const users = await api.serviceUsers();
  assert.ok(users.rows.every((row) => !oldOrders.some((order) => order.userId === row.id)));
  assert.equal((await api.statistics()).summary.orderCount, 0);
  const started = createService(f.source).startSimulation('D1P1', 'U1');
  assert.equal(started.operatorId, 'hospital');
  assert.deepEqual(
    (await api.serviceUser('U1')).orders.map((row) => row.id),
    [started.id],
  );
  assert.ok((await api.serviceUser('U1')).repairs.length === 0);
  const view = operatorDemoData(f.source, 'campus');
  assert.ok(view.orders.some((row) => row.stationId === station.id));
  assert.ok(!view.orders.some((row) => row.id === started.id));
  const merged = mergeOperatorDemoData(f.source, view, 'campus');
  assert.equal(merged.orders.find((row) => row.id === started.id).operatorId, 'hospital');
  f.login({ username: 'demo_campus', role: 'OPERATOR_ADMIN', operatorId: 'campus' });
  assert.equal(
    (await api.statistics({ stationId: station.id })).summary.orderCount,
    oldOrders.length,
  );
});

test('only completed orders contribute settlement amounts and last operator administrator stays enabled', async () => {
  const f = fixture(),
    api = f.client;
  const stats = await api.statistics();
  const ended = f.source.orders.filter((row) => row.status === 'ended');
  assert.equal(
    stats.summary.totalAmount,
    Number(ended.reduce((sum, row) => sum + row.total, 0).toFixed(2)),
  );
  await assert.rejects(api.setTeamEnabled('public-demo_campus', false, 'campus'), /最后/);
  const backup = await api.createTeam({ ...staff, role: 'OPERATOR_ADMIN' }, 'campus');
  await api.setTeamEnabled('public-demo_campus', false, 'campus');
  f.login({ username: 'another-manager', role: 'OPERATOR_ADMIN', operatorId: 'campus' });
  await assert.rejects(api.setTeamEnabled(backup.id, false), /最后/);
});
