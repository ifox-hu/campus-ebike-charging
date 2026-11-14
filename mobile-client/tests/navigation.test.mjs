import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationTarget } from '../src/domain/navigation.mjs';

test('returning to orders reuses its existing page and filters', () => {
  assert.deepEqual(navigationTarget([
    {route:'pages/mine/index'}, {route:'pages/orders/index'}, {route:'pages/session/index'}
  ], '/pages/orders/index'), {method:'navigateBack',delta:1});
});
test('a full mini-program stack redirects instead of attempting an eleventh page', () => {
  assert.deepEqual(navigationTarget(Array.from({length:10},()=>({route:'pages/home/index'})), '/pages/report/index?code=14500006-01'),
    {method:'redirectTo',url:'/pages/report/index?code=14500006-01'});
});
test('links with new query parameters open a new page instead of reusing stale arguments', () => {
  assert.equal(navigationTarget([{route:'pages/session/index'}], '/pages/session/index?id=new-order').method,'navigateTo');
  assert.deepEqual(navigationTarget([{route:'pages/home/index'}], '/pages/home/index'), {method:'navigateBack',delta:0});
});
