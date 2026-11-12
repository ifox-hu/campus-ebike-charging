// Run against an isolated H5 development preview; never a daily business database.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=process.env.MOBILE_QA_URL||'http://127.0.0.1:5297/';
  try{
    await page.goto(base+'#/pages/start/index?station=baoan&device=14500006&socket=14500006-01');
    await page.locator('.strategy-grid .strategy').nth(3).click();
    assert.match(await page.locator('.plan-hint').innerText(),/功率.*模拟.*不检测电池剩余电量/);
    await page.locator('.action-bar .primary').click();
    await page.locator('.uni-modal__btn_primary').click();
    await page.locator('.session-summary').waitFor();
    const currentPower=page.locator('.kv').filter({hasText:'当前功率'});
    assert.match(await currentPower.innerText(),/300\s*W/);
    await page.evaluate(async()=>{
      const {state,persist}=await import('/src/store.js');
      const order=state.orders.find(order=>order.status==='charging');
      order.startedAt=Date.now()-212*60000;persist();
    });
    await page.reload();
    await page.locator('.session-summary').waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.kv')).some(el=>/当前功率\s*5\s*W/.test(el.innerText)));
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(__dirname,`power-completion-${width}.png`),fullPage:true});
    }
    const expectedEnd=await page.evaluate(async()=>{
      const {state,persist}=await import('/src/store.js');
      const order=state.orders.find(order=>order.status==='charging');
      order.startedAt=Date.now()-220*60000;persist();
      return order.startedAt+215*60000;
    });
    await page.reload();
    await page.locator('.session-ring.ended').waitFor();
    const order=await page.evaluate(async()=>{
      const {state}=await import('/src/store.js');
      return state.orders.find(order=>order.completionPolicy==='POWER_V1');
    });
    assert.equal(order.energyWh,977);assert.equal(order.endedAt,expectedEnd);
    assert.equal(order.endReason,'低功率持续，模拟充电结束');
    assert.equal(order.currentPowerWatts,0);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({date:new Date().toISOString(),powerWatts:5,energyWh:order.energyWh,endReason:order.endReason,widths:[320,390],pageErrors:errors},null,2));
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
