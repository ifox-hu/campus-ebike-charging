import test from 'node:test';
import assert from 'node:assert/strict';
import { managementNavigation, csvDocument } from '../src/domain/management.js';

test('平台和运营商菜单显示各自管理职责，运营员不能打开团队账号', () => {
  const ids = (role) => managementNavigation(role).map((item) => item.id);
  assert.ok(ids('ADMIN').includes('operators'));
  assert.ok(ids('ADMIN').includes('audit'));
  assert.ok(ids('ADMIN').includes('users'));
  assert.ok(!ids('OPERATOR_ADMIN').includes('users'));
  assert.ok(!ids('OPERATOR_ADMIN').includes('operators'));
  assert.ok(ids('OPERATOR_ADMIN').includes('serviceUsers'));
  assert.ok(ids('OPERATOR_ADMIN').includes('team'));
  assert.ok(!ids('OPERATOR').includes('team'));
  assert.equal(
    managementNavigation('OPERATOR_ADMIN').find((item) => item.id === 'statistics').label,
    '经营统计',
  );
  assert.equal(
    managementNavigation('ADMIN').find((item) => item.id === 'statistics').label,
    '统计分析',
  );
  assert.deepEqual(ids('USER'), []);
});

test('导出保留中文、换行和引号，防止文本被表格软件解释为公式', () => {
  const csv = csvDocument([
    ['名称', '金额'],
    ['=1+1', '2.00'],
    ['校园,"站点"\n一', 3],
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"校园,""站点""\n一"'));
});
