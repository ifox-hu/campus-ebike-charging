import test from 'node:test';
import assert from 'node:assert/strict';
import * as workflow from '../src/domain/repairWorkflow.js';

test('分派列表只接受本运营商有效管理人员，去重并保留中文显示名', () => {
  const accounts = [
    { username: 'worker', displayName: '运营员甲', role: 'OPERATOR', enabled: true, operatorId: 1 },
    { username: 'disabled', role: 'OPERATOR', enabled: false, operatorId: 1 },
    { username: 'student', role: 'USER', enabled: true, operatorId: 1 },
    { username: 'foreign', role: 'OPERATOR', enabled: true, operatorId: 2 },
    { username: 'worker', displayName: '重复', role: 'OPERATOR', enabled: true, operatorId: 1 },
  ];
  assert.deepEqual(
    workflow.eligibleAssignees(accounts, 1).map((a) => a.username),
    ['worker'],
  );
  assert.equal(workflow.eligibleAssignees(accounts, 1)[0].displayName, '运营员甲');
});
test('报修等待时长只对未完成工单标记超时，非法日期不误报', () => {
  const now = Date.parse('2026-11-23T12:00:00+08:00');
  assert.equal(
    workflow.repairAge({ status: 'OPEN', createdAt: '2026-11-22T11:00:00' }, now).overdue,
    true,
  );
  assert.equal(
    workflow.repairAge({ status: 'RESOLVED', createdAt: '2026-11-20T11:00:00' }, now).overdue,
    false,
  );
  assert.equal(workflow.repairAge({ status: 'OPEN', createdAt: 'bad' }, now).overdue, false);
});
