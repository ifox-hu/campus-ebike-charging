import test from 'node:test'
import assert from 'node:assert/strict'
import { createTabState, visitPage, closePage } from '../src/domain/pageTabs.js'

test('打开页面保留原有标签，重复访问更新范围而不重复创建', () => {
  let state = createTabState('dashboard')
  state = visitPage(state, { page: 'devices', stationId: 'ST01' })
  state = visitPage(state, 'orders')
  state = visitPage(state, { page: 'devices', stationId: 'ST02' })
  assert.deepEqual(state.tabs, [{ page: 'dashboard', stationId: '' }, { page: 'devices', stationId: 'ST02' }, { page: 'orders', stationId: '' }])
  assert.equal(state.currentPage, 'devices')
})

test('切换已打开标签保留它自己的站点范围', () => {
  let state = visitPage(createTabState('dashboard'), { page: 'devices', stationId: 'ST01' })
  state = visitPage(state, 'orders')
  state = visitPage(state, state.tabs.find(tab => tab.page === 'devices'))
  assert.equal(state.currentPage, 'devices')
  assert.equal(state.tabs.find(tab => tab.page === 'devices').stationId, 'ST01')
})

test('关闭后台标签不影响当前页面', () => {
  const state = visitPage(visitPage(createTabState('dashboard'), 'stations'), 'orders')
  const next = closePage(state, 'stations')
  assert.equal(next.currentPage, 'orders')
  assert.deepEqual(next.tabs.map(tab => tab.page), ['dashboard', 'orders'])
})

test('关闭当前标签优先返回左邻，没有左邻则转到右邻', () => {
  const state = visitPage(visitPage(createTabState('dashboard'), 'stations'), 'orders')
  assert.equal(closePage(state, 'orders').currentPage, 'stations')
  const first = visitPage(state, 'dashboard')
  assert.equal(closePage(first, 'dashboard').currentPage, 'stations')
})

test('最后一个页面保留，未知页面不能创建标签或改变路由', () => {
  const state = createTabState('orders')
  assert.deepEqual(closePage(state, 'orders'), state)
  assert.deepEqual(closePage(state, 'missing'), state)
  assert.deepEqual(visitPage(state, 'missing'), state)
  assert.equal(createTabState('missing').currentPage, 'dashboard')
})
