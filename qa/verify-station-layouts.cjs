const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const base=process.env.ADMIN_MAP_BASE||'http://127.0.0.1:5195'
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true})
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/#/dashboard')
  await page.locator('input[autocomplete=username]').fill(process.env.ADMIN_MAP_USER||'admin')
  await page.locator('input[autocomplete=current-password]').fill(process.env.ADMIN_MAP_PASSWORD||'Admin@123456')
  await page.locator('.login-submit').click()
  await page.locator('.navigation .nav-item').filter({hasText:'设备与插座'}).click()
  await page.locator('.physical-row').first().waitFor()
  const cases=[['ST01','逸夫教学楼南侧示例站',[12,15,12]],['ST02','中区四公寓东侧示例站',[13,15]],['ST03','体育馆南侧示例站',[12]],['ST04','西区八公寓北侧示例站',[9,11,8]],['ST05','东升园餐厅南侧示例站',[10,12]]]
  const results=[]
  for(const [id,name,counts] of cases){
   await page.getByLabel('筛选站点',{exact:true}).selectOption(id)
   await page.waitForFunction(expected=>document.querySelector('.layout-summary strong')?.textContent===expected,name,{timeout:3000})
   assert.equal(await page.locator('.physical-row').count(),counts.length)
   for(const [index,count] of counts.entries())assert.equal(await page.locator('.physical-row').nth(index).locator('.physical-device').count(),count)
   assert.match(await page.locator('.layout-summary').innerText(),new RegExp(counts.reduce((a,b)=>a+b,0)+' 台设备'))
   results.push({id,name,rows:counts})
   if(id==='ST02'||id==='ST04')await page.locator('.management-glass').screenshot({path:path.join(__dirname,'station-layout-'+id+'.jpg')})
  }
  await page.getByLabel('筛选站点',{exact:true}).selectOption('ST02')
  await page.getByRole('button',{name:'设备列表',exact:true}).click()
  assert.match(await page.locator('.table-pagination').innerText(),/共 28 条记录/)
  await page.getByLabel('筛选站点',{exact:true}).selectOption('ST03')
  await page.getByRole('button',{name:'现场排布',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.layout-summary strong')?.textContent==='体育馆南侧示例站',null,{timeout:3000})
  assert.equal(await page.locator('.physical-row').count(),1)
  assert.deepEqual(errors,[])
  const proof={date:'2026-11-09',base,immediateStationSwitch:true,stationProfiles:results,deviceListAgrees:true,pageErrors:errors}
  fs.writeFileSync(path.join(__dirname,'station-layout-verification.json'),JSON.stringify(proof,null,2)+'\n')
  console.log(JSON.stringify(proof,null,2))
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
