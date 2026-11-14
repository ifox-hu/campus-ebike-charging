// Native callbacks never settle the business order. Always ask the signed backend query.
export async function payAlipayMini({native,checkout,query}) {
  const authCode=await new Promise((resolve,reject)=>native.getAuthCode({scopes:'auth_base',
    success:r=>r.authCode?resolve(r.authCode):reject(new Error('支付宝授权未完成，请重试')),
    fail:()=>reject(new Error('支付宝授权未完成，请重试'))}));
  const result=await checkout(authCode);
  if(!result)return null;
  if(result.environment!=='ALIPAY_MINI_SANDBOX'||!/^\d{10,50}$/.test(result.tradeNo))throw new Error('支付宝小程序沙箱订单无效');
  await new Promise(resolve=>{
    try{native.tradePay({tradeNO:result.tradeNo,success:resolve,fail:resolve});}
    catch{resolve();}
  });
  return query();
}
