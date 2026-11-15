import { navigation } from '../data.js'

const validPage = page => navigation.some(item => item.id === page)

export function createTabState(initial = 'dashboard') {
  const page = validPage(initial) ? initial : 'dashboard'
  return { currentPage: page, tabs: [{ page, stationId: '' }] }
}

export function visitPage(state, target) {
  const tab = typeof target === 'string' ? { page: target } : target
  if (!tab || !validPage(tab.page)) return state
  const next = { page: tab.page, stationId: tab.stationId || '' }
  const exists = state.tabs.some(item => item.page === tab.page)
  return {
    currentPage: tab.page,
    tabs: exists ? state.tabs.map(item => item.page === tab.page ? next : item) : [...state.tabs, next],
  }
}

export function closePage(state, page) {
  const index = state.tabs.findIndex(tab => tab.page === page)
  if (index < 0 || state.tabs.length === 1) return state
  const tabs = state.tabs.filter(tab => tab.page !== page)
  return {
    tabs,
    currentPage: state.currentPage === page ? tabs[Math.max(0, index - 1)].page : state.currentPage,
  }
}
