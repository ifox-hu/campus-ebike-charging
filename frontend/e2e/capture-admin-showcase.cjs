// Capture the current administration UI in an isolated browser context.
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const assert = require('node:assert/strict')
const base = (process.env.ADMIN_SHOWCASE_URL || 'http://127.0.0.1:5207/').replace(/\/?$/, '/')
const out = path.resolve(__dirname, '../../docs/screenshots')
const viewport = { width: 1600, height: 1100 }

async function main() {
  const { createSeed } = await import(pathToFileURL(path.resolve(__dirname, '../src/domain/seed.js')))
  const fixture = createSeed()
  const campus = ['校园教学区示例站', '校园生活区示例站', '校园体育区示例站', '校园宿舍区示例站', '校园餐饮区示例站', '校园通勤区示例站']
  fixture.scenarioCatalogRevision = 1
  fixture.stations.forEach((station, i) => {
    station.name = campus[i] || station.scene + '集中充电示例站 ' + String(i + 1).padStart(2, '0')
    station.address = station.scene + ' · 非机动车集中停放与充电示例区'
    station.note = '截图专用模拟站点，不代表实际安装设施。'
    station.campusLocationRevision = 0
    station.lng = 112.53 + (i % 4) * .003
    station.lat = 32.99 + Math.floor(i / 4) * .002
    delete station.landmark
  })
  fixture.orders.forEach(order => { order.stationName = fixture.stations.find(station => station.id === order.stationId).name })
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' })
    await context.addInitScript(data => {
      if (!sessionStorage.getItem('admin-showcase-initialized')) {
        localStorage.setItem('ebike-graduation-admin-demo-v3', JSON.stringify(data))
        sessionStorage.setItem('admin-showcase-initialized', '1')
      }
    }, fixture)
    const page = await context.newPage()
    const errors = [], captures = []
    page.on('pageerror', error => errors.push(error.message))
    const nav = page.getByRole('navigation', { name: '主导航', exact: true })
    const tabs = page.getByRole('navigation', { name: '已打开的页面', exact: true })
    const capture = async (name, title) => {
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => [...document.images].every(image => image.complete))
      assert.doesNotMatch(await page.locator('body').innerText(), /南阳师范学院|南阳理工学院|逸夫|东升园|四公寓|八公寓/)
      const file = 'showcase-admin-' + name + '.png'
      await page.screenshot({ path: path.join(out, file), animations: 'disabled' })
      captures.push({ file, title })
    }
    await page.goto(base + '#/dashboard')
    await page.getByRole('heading', { name: '在线演示登录', exact: true }).waitFor()
    await page.waitForFunction(() => !!document.querySelector('.ec-stage canvas'))
    await page.waitForTimeout(1200) // Allow the actual 3D entrance to become visible.
    await capture('login', '能量核心登录与原版标志')
    await page.getByRole('button', { name: '填入演示账号', exact: true }).click()
    await page.locator('.login-submit').click()
    await page.locator('.metric-card').first().waitFor()
    await page.getByRole('button', { name: '全部数据', exact: true }).click()
    await page.locator('.map-runtime.ready, .map-diagram').first().waitFor({ timeout: 35000 })
    const mapMode = await page.locator('.map-diagram').count() ? 'diagram' : 'amap'
    if (process.env.ADMIN_SHOWCASE_REQUIRE_AMAP === 'true') assert.equal(mapMode, 'amap', '本次要求高德底图，但页面处于坐标示意模式')
    const logo = decodeURIComponent(await page.locator('.brand-logo').getAttribute('src'))
    assert.ok(logo.includes('615eff') || logo.includes('brand-mark'), '页面必须加载项目原版 logo')
    await nav.getByRole('button', { name: '站点管理', exact: true }).click()
    await nav.getByRole('button', { name: '设备与插座', exact: true }).click()
    await page.getByLabel('筛选站点', { exact: true }).selectOption('ST01')
    await page.locator('.layout-summary strong').filter({ hasText: '校园教学区示例站' }).waitFor()
    await capture('layout', '按排管理双插座设备与页面标签')
    await page.locator('.physical-device').first().click()
    await page.getByRole('dialog', { name: '设备与独立插座', exact: true }).waitFor()
    await capture('socket', '设备详情与 A/B 独立插座')
    await page.getByRole('button', { name: '关闭弹窗', exact: true }).click()
    await nav.getByRole('button', { name: '充电订单', exact: true }).click()
    await page.getByRole('heading', { name: '充电订单', exact: true }).waitFor()
    await capture('orders', '充电订单、状态与账单查询')
    await nav.getByRole('button', { name: '运营与告警', exact: true }).click()
    await page.locator('.operations').waitFor()
    await capture('operations', '运营分析与告警工作台')
    await tabs.getByRole('button', { name: '运营概览', exact: true }).click()
    await page.locator('.metric-card').first().waitFor({ state: 'visible' })
    await capture('dashboard', '运营概览与站点分布')
    assert.deepEqual(errors, [], '截图期间不应有页面脚本错误')
    const proof = { capturedAt: new Date().toISOString(), source: base, mode: 'pages', viewport, mapMode, scenarios: [...new Set(fixture.stations.map(station => station.scene))], stationCount: fixture.stations.length, logo: 'original-graduation-logo', isolatedBrowserContext: true, defaultBusinessDataUnchanged: true, captures, errors }
    fs.writeFileSync(path.join(out, 'admin-showcase.json'), JSON.stringify(proof, null, 2) + '\n')
    console.log(JSON.stringify(proof, null, 2))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
