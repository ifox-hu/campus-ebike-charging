<template>
  <view class="phone session-page">
    <PageHeader :title="isCurrentOrder(order||{})?orderStatusText(order):'充电订单详情'" back/>
    <ConnectionState/>
    <view v-if="order" class="padded-content">
      <view class="panel session-summary">
        <view :class="['session-ring',{ended:order.status==='ended'}]">
          <view class="ring-inner"><text class="small muted">{{order.status==='ended'?'充电已结束':orderStatusText(order)}}</text><text class="energy-value">{{energy(order.energyWh)}}</text><text class="muted">度 · kWh</text></view>
        </view>
        <view class="session-stat">
          <view><text class="stat-value">{{order.minutes===null?'—':order.minutes}}<text>分钟</text></text><text class="muted">充电时长</text></view>
          <view><text class="stat-value">{{yuan(order.totalCents)}}<text>元</text></text><text class="muted">{{order.status==='charging'?(isBackend?'当前已记账费用':'估算费用'):'订单金额'}}</text></view>
        </view>
        <text class="payment-status">{{paymentText}}</text>
        <view v-if="order.chargeMode==='FULL'" class="full-status"><text class="full-status-title">充满自停 · 软件模拟</text><text>{{order.status==='charging'?'按预设功率曲线演示，低功率保持后自动结束':'本次订单采用充满自停模拟'}}</text><text>不检测真实电池电量，不代表硬件充满保护</text></view>
        <text v-if="order.failureReason" class="field-error">{{order.failureReason}}</text>
      </view>
      <view class="panel">
        <view class="section-title">充电信息</view>
        <view class="kv"><text>充电站点</text><text>{{order.stationName}}</text></view>
        <view v-if="order.powerWatts" class="kv"><text>配置功率</text><text>{{order.powerWatts}} W</text></view>
        <view v-if="order.chargeMode" class="kv"><text>充电方式</text><text>{{order.chargeMode==='FULL'?'充满自停（模拟）':'定时充电'}}</text></view>
        <view v-if="order.status==='charging'&&order.currentPowerWatts!=null" class="kv"><text>模拟当前功率</text><text>{{order.currentPowerWatts}} W</text></view>
        <view class="kv"><text>支付方式</text><text>{{paymentMethodName(order.paymentMethod)}}{{order.paymentEnvironment==='MOCK'?'（模拟）':''}}</text></view><view class="kv"><text>插座编号</text><text>{{order.socketCode}}</text></view>
        <view v-if="order.durationMinutes" class="kv"><text>选择时长</text><text>{{order.durationMinutes}} 分钟</text></view><view v-if="order.scheduledEndsAt" class="kv"><text>{{order.chargeMode==='FULL'?'模拟预计结束':'预计结束'}}</text><text>{{isBackend?serverTime(order.scheduledEndTimeText):date(order.scheduledEndsAt)}}</text></view><view v-if="order.status==='charging' && order.scheduledEndsAt" class="kv"><text>剩余时间</text><text>{{remainingText}}</text></view><view v-if="order.endReason==='DURATION_REACHED'" class="kv"><text>结束原因</text><text>已达到选择时长</text></view><view v-if="order.endReason==='FULL_SIMULATED'" class="kv"><text>结束原因</text><text>已达到模拟充满条件</text></view><view class="kv"><text>开始时间</text><text>{{isBackend?serverTime(order.startTimeText):date(order.startedAt)}}</text></view>
        <view v-if="order.status==='ended'" class="kv"><text>结束时间</text><text>{{isBackend?serverTime(order.endTimeText):date(order.endedAt)}}</text></view>
        <view class="kv"><text>订单编号</text><text class="small">{{order.orderNo||order.id}}</text></view>
        <view class="kv"><text>电费{{order.rates?'（'+yuan(order.rates.electricity)+' 元/度）':''}}</text><text>¥{{yuan(order.electricityCents)}}</text></view>
        <view v-if="order.serviceCents>0" class="kv"><text>历史服务费{{order.rates?'（'+yuan(order.rates.service)+' 元/度）':''}}</text><text>¥{{yuan(order.serviceCents)}}</text></view>
        <view class="kv total"><text>合计</text><text class="teal">¥{{yuan(order.totalCents)}}</text></view>
        <text v-if="isBackend" class="block muted small">费用由平台结算；历史订单不使用当前站点费率重新计算。</text><text v-if="order.meteringSource" class="block muted small">{{order.simulatedPowerWatts ? '计量参考功率 '+order.simulatedPowerWatts+' W' : '电量以平台记录为准'}}</text>
      </view>
      <view v-if="order.ratePeriods?.length" class="panel"><text class="section-title">本次费率（启动时保存）</text><view v-for="(period,index) in order.ratePeriods" :key="index" class="rate-period"><text class="block">{{period.startTime}}—{{period.endTime}}</text><text class="muted small">电费 {{period.electricityPrice}} 元/度<text v-if="Number(period.servicePrice)>0"> · 历史服务费 {{period.servicePrice}} 元/度</text></text></view></view>

      <view v-if="order.payment==='unpaid'&&order.status==='ended'" class="panel settlement-panel">
        <view class="section-row"><text class="section-title">{{sandboxLocked?'支付宝沙箱交易':'选择支付方式'}}</text><text class="tag">{{sandboxLocked?'测试交易':'模拟 · 不扣款'}}</text></view>
        <template v-if="!sandboxLocked"><PaymentChoices v-model="selectedPayment" :disabled="paying||!!connection.operation"/><text class="block muted small settlement-hint">仅演示支付流程，不调用微信或支付宝真实收款。</text><text v-if="!mockEnabled" class="block field-error">当前服务未启用模拟支付，可使用下方支付宝沙箱。</text></template>
        <text v-else class="block muted small">此订单已发起沙箱交易，请查询结果，不能切换为模拟支付。</text>
        <button v-if="isBackend&&sandboxLocked" class="text-button" :disabled="paying||!!connection.operation" @click="checkPayment">已完成付款？查询支付结果</button>
        <button v-if="isBackend&&!sandboxLocked&&selectedPayment==='alipay'" class="text-button sandbox-link" :disabled="paying||!!connection.operation" @click="paySandbox">改用支付宝沙箱测试 ›</button>
      </view>
      <button class="text-button" @click="go('/pages/report/index?code='+encodeURIComponent(order.socketCode))">反馈设备问题</button>
    </view>
    <view v-else class="empty-state">{{connection.loading?'正在读取订单':'没有找到该订单'}}<text>可返回充电记录查看已有订单</text><button class="primary turquoise" @click="showOrders">查看充电记录</button></view>
    <view v-if="order" class="action-bar">
      <button v-if="order.status==='starting'" class="primary turquoise" disabled>等待启动结果</button>
      <button v-else-if="order.status==='charging'" class="primary turquoise" :disabled="confirming||!!connection.operation||connection.loading" :loading="connection.operation==='stop'" @click="stop">结束充电</button>
      <button v-else-if="order.status==='ended'&&order.payment==='unpaid'&&order.totalCents!==null" class="primary turquoise" :disabled="paying||!!connection.operation||connection.loading||(!sandboxLocked&&!mockEnabled)" :loading="paying||!!connection.operation" @click="sandboxLocked?checkPayment():pay()">{{sandboxLocked?'查询沙箱支付结果':'确认模拟支付 ¥'+yuan(order.totalCents)}}</button>
      <button v-else-if="order.status==='unknown'||order.payment==='unknown'||order.totalCents===null" class="primary turquoise" :disabled="syncing" @click="syncOrder">刷新订单状态</button>
      <button v-else class="primary turquoise" @click="showOrders">查看充电记录</button>
    </view>
  </view>
</template>
<script setup>
import {ref,computed,watch} from 'vue';
import {onLoad,onShow,onHide,onUnload} from '@dcloudio/uni-app';
import PageHeader from '../../components/PageHeader.vue';
import PaymentChoices from '../../components/PaymentChoices.vue';

import ConnectionState from '../../components/ConnectionState.vue';
import {state,action,go,isBackend,connection,refreshData,refreshOrder,operateOrder,checkoutAlipay,payAlipayMiniNative,mockPayBackend} from '../../store.js';
import {refreshSession,stopSession,payOrder,yuan,energy,paymentMethodName} from '../../domain/charging.mjs';
import {isCurrentOrder,orderStatusText} from '../../domain/order-status.mjs';
const clockNow=ref(Date.now());
const remainingText=computed(()=>{const seconds=Math.max(0,Math.ceil(((order.value?.scheduledEndsAt||0)-clockNow.value)/1000));return seconds?Math.floor(seconds/60)+' 分 '+String(seconds%60).padStart(2,'0')+' 秒':'等待平台确认结束';});
const id=ref(''),confirming=ref(false),syncing=ref(false),paying=ref(false);
const sandboxMethod=method=>['ALIPAY_SANDBOX','ALIPAY_MINI_SANDBOX'].includes(method);
const order=computed(()=>state.orders.find(o=>o.id===id.value));
const sandboxLocked=computed(()=>sandboxMethod(order.value?.paymentMethod));
const mockEnabled=computed(()=>!isBackend||connection.user?.features?.mockPayment===true);
const selectedPayment=ref('wechat');
watch(()=>order.value?.paymentMethod,value=>{if(['WECHAT','ALIPAY','wechat','alipay'].includes(value))selectedPayment.value=value.toLowerCase();},{immediate:true});
onLoad(q=>{id.value=q.id||state.orders.find(isCurrentOrder)?.id||'';});
const serverTime=value=>typeof value==='string'?value.replace('T',' ').slice(0,16):'—';
const date=value=>{if(!Number.isFinite(value))return '—';const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const paymentText=computed(()=>{
  if(!order.value)return '';
  if(order.value.status==='starting')return '正在等待启动结果，尚未结算';
  if(order.value.status==='failed')return '启动失败，未进入支付';
  if(order.value.status==='charging')return '最终金额以结束后的结算结果为准';
  if(order.value.payment==='paid'&&order.value.paymentEnvironment==='MOCK')return '模拟支付已完成 · 未发生真实扣款';
  if(order.value.payment==='paid'&&sandboxMethod(order.value.paymentMethod))return '沙箱支付已确认（测试交易）';
  return ({paid:'已完成',free:'本次无需支付',unpaid:'待支付'})[order.value.payment]||'支付状态待确认';
});
const stop=()=>{
  if(confirming.value||connection.operation)return;
  confirming.value=true;
  uni.showModal({title:'结束充电',content:isBackend?'是否请求结束当前充电？结算结果以平台返回为准。':'将按当前充电电量结算并释放插座。是否结束？',confirmText:'确认结束',
    success:async r=>{if(r.confirm){if(isBackend)await operateOrder(id.value,'stop');else action(()=>stopSession(state,id.value));}},
    complete:()=>{confirming.value=false;}
  });
};
const pay=async()=>{
  if(connection.operation||paying.value||!mockEnabled.value||sandboxLocked.value)return;
  paying.value=true;
  const orderId=id.value,method=selectedPayment.value;
  try{
    const confirm=await new Promise(resolve=>uni.showModal({title:'确认模拟支付',content:paymentMethodName(method)+' · ¥'+yuan(order.value.totalCents)+'。仅演示支付，不会真实扣款。',confirmText:'确认模拟',success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
    if(!confirm)return;
    const result=isBackend?await mockPayBackend(orderId,method):action(()=>payOrder(state,orderId,method));
    if(result)uni.showToast({title:result.payment==='paid'?'模拟支付已完成，未扣款':'支付状态请以订单为准',icon:'none'});
  }finally{paying.value=false;}
};
const paySandbox=async()=>{
  if(connection.operation||paying.value)return;
  if(!isBackend){uni.showModal({title:'请使用联机模式',content:'本地订单不能向支付宝发起付款。请连接业务后端并登录后创建充电订单。',showCancel:false});return;}
  // #ifdef H5
  const result=await checkoutAlipay(id.value);
  if(result)window.location.assign(result.checkoutUrl);
  // #endif
  // #ifdef MP-ALIPAY
  paying.value=true;
  const orderId=id.value;
  try {
    const result=await payAlipayMiniNative(orderId,my);
    if(result)uni.showToast({title:result.payment==='paid'?'沙箱支付已确认':'尚未确认支付，可稍后查询',icon:'none'});
  }catch(error){uni.showToast({title:error.message||'支付状态待确认，请查询订单',icon:'none'});}
  finally{paying.value=false;}
  // #endif
  // #ifndef H5 || MP-ALIPAY
  uni.showModal({title:'请使用支付宝小程序',content:'此端未接入微信支付。请使用支付宝小程序或浏览器用户端进行沙箱测试。',showCancel:false});
  // #endif
};
const checkPayment=async()=>{
  if(!isBackend||connection.operation)return;
  const result=await operateOrder(id.value,'pay');
  if(result)uni.showToast({title:result.payment==='paid'?'沙箱支付已确认':'尚未确认支付，请稍后查询',icon:'none'});
};
const showOrders=()=>go('/pages/orders/index');
let visible=false,timer=null,clockTimer=null;
const syncOrder=async()=>{
  if(!isBackend||!visible||!id.value||syncing.value||connection.operation||!connection.user)return;
  syncing.value=true;
  try{await refreshOrder(id.value);}finally{syncing.value=false;}
};
const hide=()=>{visible=false;if(clockTimer)clearInterval(clockTimer);clockTimer=null;if(timer)clearInterval(timer);timer=null;};
onShow(async()=>{
  hide();visible=true;clockNow.value=Date.now();clockTimer=setInterval(()=>{clockNow.value=Date.now();},1000);
  if(!isBackend){
    const refreshLocal=()=>{if(order.value?.status==='charging')action(()=>refreshSession(state,id.value));};
    refreshLocal();timer=setInterval(refreshLocal,1000);return;
  }
  await refreshData();
  if(!visible)return;
  if(!id.value)id.value=state.orders.find(isCurrentOrder)?.id||'';
  await syncOrder();
  if(visible&&!paying.value&&order.value?.payment==='unpaid'&&sandboxMethod(order.value?.paymentMethod))await checkPayment();
  if(visible&&!timer)timer=setInterval(()=>{if(order.value&&isCurrentOrder(order.value))syncOrder();},5000);
});
onHide(hide);onUnload(hide);
</script>

<style scoped>
.full-status{display:flex;flex-direction:column;gap:5px;margin-top:16px;padding:13px 15px;background:#edfaf9;border-radius:12px;font-size:11px;color:#6b8a8f;line-height:1.7;text-align:left}.full-status-title{color:#0e9faa;font-size:13px;font-weight:600}.settlement-hint{margin-top:14px;line-height:1.8}.sandbox-link{margin-top:6px;border-top:1px solid #eef3f4}.session-summary{overflow:hidden}.kv{gap:14px}.kv>text:last-child{text-align:right;word-break:break-all}
</style>
