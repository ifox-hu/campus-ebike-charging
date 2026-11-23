import test from 'node:test';
import assert from 'node:assert/strict';
import * as refresh from '../src/connected/refreshPolicy.js';

test('后台刷新快数据，基础信息每分钟或手动刷新，失败不推进时间', () => {
  let now = 1000;
  const policy = refresh.createRefreshPolicy({ now: () => now });
  assert.equal(policy.includeBase(true), true);
  policy.baseLoaded();
  now += 5000;
  assert.equal(policy.includeBase(true), false);
  assert.equal(policy.includeBase(false), true);
  now += 55000;
  assert.equal(policy.includeBase(true), true);
  assert.equal(policy.includeBase(true), true);
  policy.baseLoaded();
  assert.equal(policy.includeBase(true), false);
  policy.reset();
  assert.equal(policy.includeBase(true), true);
});
