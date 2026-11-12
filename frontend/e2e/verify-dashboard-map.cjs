// Optional local proof: install playwright separately, or point NODE_PATH at it.
// Uses an isolated browser context; never alters the normal browser's demo data.
const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const base=process.env.ADMIN_MAP_BASE||'http://127.0.0.1:5195'
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true})
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100}})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/#/dashboard')
  await page.locator('input[autocomplete=username]').fill(process.env.ADMIN_MAP_USER||'admin')
  await page.locator('input[autocomplete=current-password]').fill(process.env.ADMIN_MAP_PASSWORD||'Admin@123456')
  await page.locator('.login-submit').click();await page.locator('.station-map-card').waitFor({timeout:20000})
  const authCookies=await context.cookies()
  await page.locator('.map-loading').waitFor({state:'hidden',timeout:35000})
  assert.ok(await page.locator('.station-map-card').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'地图卡片不能继承图表固定高度而裁切详情和操作')
  assert.equal(await page.locator('.metric-card').count(),7)
  const positions=await page.evaluate(()=>({metrics:document.querySelector('.metric-grid').getBoundingClientRect().bottom,map:document.querySelector('.station-map-card').getBoundingClientRect(),trend:document.querySelector('.sales-card').getBoundingClientRect().top}))
  assert.ok(positions.map.top>=positions.metrics&&positions.trend>=positions.map.bottom)
  const mode=await page.locator('.map-diagram').count()?'diagram':'amap'
  // Use the module actually loaded by the app. A bare import after HMR can
  // create a second store without the timestamp used by the application.
  const runtimeStoreUrl=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname==='/src/domain/store.js'))
  assert.ok(runtimeStoreUrl)
  const campusPositions=await page.evaluate(async url=>{const {db}=await import(url);return db.stations.slice(0,5).map(s=>({id:s.id,lat:s.lat,lng:s.lng,address:s.address}))},runtimeStoreUrl)
  assert.equal(campusPositions.length,5)
  assert.ok(campusPositions.every(s=>s.lng>112.475&&s.lng<112.5&&s.lat>32.973&&s.lat<32.982&&s.address.includes('南阳师范学院')),'所有默认示例点应位于南阳师范学院校址范围')
  await page.locator('.station-map-card').screenshot({path:path.join(__dirname,'dashboard-campus-map.jpg')})
  await page.getByRole('button',{name:'选择站点 逸夫教学楼南侧示例站',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.station-map-details h3')?.textContent==='逸夫教学楼南侧示例站')
  assert.match(await page.locator('.station-attention').innerText(),/待处理报修\s*3/)
  // Allow the real provider's zoom animation and newly requested tiles to paint for visual QA.
  await page.waitForTimeout(1500)
  await page.locator('.station-map-card').screenshot({path:path.join(__dirname,'dashboard-map-selected.jpg')})
  await page.getByRole('button',{name:'查看设备排布',exact:true}).click()
  await page.locator('.physical-row').first().waitFor()
  assert.equal(await page.getByLabel('筛选站点',{exact:true}).inputValue(),'ST01')
  assert.equal(await page.locator('.physical-row').count(),3)
  await page.locator('.navigation .nav-item').filter({hasText:'数据统计'}).click()
  await page.locator('.station-map-card').waitFor();await page.locator('.map-loading').waitFor({state:'hidden',timeout:35000})
  await page.getByLabel('选择地图站点',{exact:true}).selectOption('ST01')
  await page.getByRole('button',{name:/^查看报修/}).click()
  await page.locator('.management-heading h1').filter({hasText:'故障报修'}).waitFor()
  assert.equal(await page.getByLabel('筛选站点',{exact:true}).inputValue(),'ST01')
  await page.locator('.navigation .nav-item').filter({hasText:'数据统计'}).click()
  await page.locator('.station-map-card').waitFor()
  await page.getByLabel('地图搜索站点',{exact:true}).fill('四公寓')
  await page.getByLabel('选择地图站点',{exact:true}).selectOption('ST02')
  assert.match(await page.locator('.station-map-details h3').innerText(),/四公寓/)
  await page.getByLabel('地图筛选状态',{exact:true}).selectOption('alert')
  await page.getByText('没有匹配站点',{exact:true}).waitFor()
  assert.match(await page.locator('.station-map-details h3').innerText(),/全部站点概况/)
  await page.getByRole('button',{name:'查看全部站点',exact:true}).click()
  assert.equal(await page.getByLabel('地图搜索站点',{exact:true}).inputValue(),'')
  for(const width of [1280,1024]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
  await page.setViewportSize({width:1600,height:1100})
  await page.screenshot({path:path.join(__dirname,'dashboard-map-home.jpg'),fullPage:true})
  // Missing coordinates remain available in the station selector without a false marker.
  await page.evaluate(async url=>{const {db}=await import(url);db.stations[0].lat=null},runtimeStoreUrl)
  await page.getByLabel('选择地图站点',{exact:true}).selectOption('ST01')
  await page.getByText('坐标缺失或坐标系未确认，请在站点管理中核对。',{exact:true}).waitFor()
  await page.evaluate(async url=>{const {db}=await import(url);db.stations.splice(0)},runtimeStoreUrl)
  await page.getByText('暂无站点',{exact:true}).waitFor()
  // Block only the external provider; the actual component and application still run.
  const offline=await browser.newContext({viewport:{width:1600,height:1100},storageState:{cookies:authCookies,origins:[]}})
  await offline.route('https://webapi.amap.com/**',route=>route.abort())
  const fallback=await offline.newPage();fallback.on('pageerror',e=>errors.push(e.message))
  await fallback.goto(base+'/#/dashboard');await fallback.locator('.map-diagram').waitFor({timeout:20000})
  await fallback.getByRole('button',{name:'选择站点 逸夫教学楼南侧示例站',exact:true}).focus()
  await fallback.keyboard.press('Enter')
  await fallback.getByRole('button',{name:'查看设备排布',exact:true}).waitFor()
  await fallback.locator('.station-map-card').screenshot({path:path.join(__dirname,'dashboard-map-fallback.jpg')})
  assert.deepEqual(errors,[])
  const result={date:'2026-11-09',base,mapMode:mode,results:['保留7项统计与原有图表，地图位于两者之间','地图选择与站点详情联动','设备排布和报修跳转保留ST01筛选','搜索状态组合、选择失效和清空筛选正确','缺失坐标不落点、空站点列表可恢复','外部地图断网时可用坐标示意和键盘选择','1280/1024px页面无横向溢出'],pageErrors:errors}
  fs.writeFileSync(path.join(__dirname,'dashboard-map-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2))
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
