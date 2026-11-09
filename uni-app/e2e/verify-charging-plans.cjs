// Run against this worktree's H5 preview. Playwright is a local QA dependency.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.MOBILE_QA_URL||'http://127.0.0.1:5197/';
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const visit=async route=>{await page.goto(base+'#/'+route);await page.waitForTimeout(500);};
  try{
    await visit('pages/start/index?station=baoan&device=14500006&socket=14500006-01');
    const options=page.locator('.strategy-grid .strategy');
    await options.first().waitFor();
    assert.equal(await options.count(),6);
    assert.doesNotMatch(await page.locator('.strategy-grid').innerText(),/手动结束|软件模拟|300W/);
    for(const [index,amount] of [[0,'0.24'],[1,'0.48'],[2,'0.72'],[3,'0.96'],[4,'1.20']]){
      await options.nth(index).click();
      assert.match(await page.locator('.start-summary').innerText(),new RegExp(amount.replace('.','\\.')));
      assert.equal(await page.locator('.strategy.active').count(),1);
    }
    await options.nth(5).click();
    assert.match(await page.locator('.start-summary').innerText(),/按实际用电结算/);
    assert.equal(await page.locator('.start-summary .price-orange').count(),0);
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      await options.nth(2).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(__dirname,`charging-plans-${width}.png`),fullPage:true});
    }
    await options.nth(4).click();
    await page.locator('.action-bar .primary').click();
    await page.locator('.uni-modal').waitFor();
    assert.match(await page.locator('.uni-modal').innerText(),/5小时.*1\.20/);
    await page.locator('.uni-modal__btn_primary').click();
    await page.locator('.session-summary').waitFor();
    assert.match(await page.locator('.padded-content').innerText(),/充电方式\s*5小时/);
    assert.match(await page.locator('.padded-content').innerText(),/启动时预计金额\s*¥1\.20/);
    const orderId=await page.evaluate(async()=>{
      const {state,persist}=await import('/src/store.js');
      const order=state.orders.find(o=>o.status==='charging');
      const assertPlan=order.chargePlan.id;
      if(assertPlan!=='HOUR_5')throw Error('Wrong selected plan');
      order.startedAt=Date.now()-310*60000;persist();return order.id;
    });
    // Re-enter home to prove automatic completion also works outside the session screen.
    await visit('pages/home/index');
    await visit('pages/session/index?id='+encodeURIComponent(orderId));
    await page.getByText('定时时长已到',{exact:true}).waitFor();
    assert.equal((await page.locator('.energy-value').innerText()).trim(),'1.500');
    const pay=page.locator('.action-bar .primary');
    assert.match(await pay.innerText(),/确认模拟支付 ¥1\.20/);
    await pay.click();
    await page.getByText('模拟支付完成',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    const report={date:'2026-11-09',options:6,prices:['0.24','0.48','0.72','0.96','1.20'],fullCharge:'按实际用电结算',widths:[320,390],deadlineBill:'5小时 / 1.500kWh / ¥1.20',payment:'模拟支付完成',pageErrors:errors};
    fs.writeFileSync(path.join(__dirname,'charging-plans-verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
