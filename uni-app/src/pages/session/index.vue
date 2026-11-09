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
        <text v-if="order.failureReason" class="field-error">{{order.failureReason}}</text>
      </view>
      <view class="panel">
        <view class="section-title">充电信息</view>
        <view class="kv"><text>充电站点</text><text>{{order.stationName}}</text></view>
        <view class="kv"><text>插座编号</text><text>{{order.socketCode}}</text></view>
        <view v-if="order.chargePlan" class="kv"><text>充电方式</text><text>{{order.chargePlan.label}}</text></view>
        <view v-if="order.estimatedCents!=null" class="kv"><text>启动时预计金额</text><text>¥{{yuan(order.estimatedCents)}}</text></view>
        <view v-if="order.endReason" class="kv"><text>结束原因</text><text>{{order.endReason}}</text></view>
        <view class="kv"><text>开始时间</text><text>{{isBackend?serverTime(order.startTimeText):date(order.startedAt)}}</text></view>
        <view v-if="order.status==='ended'" class="kv"><text>结束时间</text><text>{{isBackend?serverTime(order.endTimeText):date(order.endedAt)}}</text></view>
        <view class="kv"><text>订单编号</text><text class="small">{{order.orderNo||order.id}}</text></view>
        <view class="kv"><text>电费{{order.rates?'（'+yuan(order.rates.electricity)+' 元/度）':''}}</text><text>¥{{yuan(order.electricityCents)}}</text></view>
        <view class="kv"><text>服务费{{order.rates?'（'+yuan(order.rates.service)+' 元/度）':''}}</text><text>¥{{yuan(order.serviceCents)}}</text></view>
        <view class="kv total"><text>合计</text><text class="teal">¥{{yuan(order.totalCents)}}</text></view>
        <text v-if="isBackend" class="block muted small">费用由平台结算；历史订单不使用当前站点费率重新计算。</text><text v-if="order.meteringSource" class="block muted small">{{order.meteringSource==='SOFTWARE'?'平台软件模拟计量 · '+order.simulatedPowerWatts+'W':'设备模拟器计量'}}</text>
      </view>
      <view v-if="order.ratePeriods?.length" class="panel"><text class="section-title">本次费率（启动时保存）</text><view v-for="(period,index) in order.ratePeriods" :key="index" class="rate-period"><text class="block">{{period.startTime}}—{{period.endTime}}</text><text class="muted small">电费 {{period.electricityPrice}} 元/度 · 服务费 {{period.servicePrice}} 元/度</text></view></view>
      <DemoNotice/>
      <button class="text-button" @click="go('/pages/report/index?code='+encodeURIComponent(order.socketCode))">反馈设备问题</button>
    </view>
    <view v-else class="empty-state">{{connection.loading?'正在读取订单':'没有找到该订单'}}<text>可返回充电记录查看已有订单</text><button class="primary turquoise" @click="showOrders">查看充电记录</button></view>
    <view v-if="order" class="action-bar">
      <button v-if="order.status==='starting'" class="primary turquoise" disabled>等待启动结果</button>
      <button v-else-if="order.status==='charging'" class="primary turquoise" :disabled="confirming||!!connection.operation||connection.loading" :loading="connection.operation==='stop'" @click="stop">结束充电</button>
      <button v-else-if="order.status==='ended'&&order.payment==='unpaid'&&order.totalCents!==null" class="primary turquoise" :disabled="!!connection.operation||connection.loading" :loading="connection.operation==='pay'" @click="pay">确认模拟支付 ¥{{yuan(order.totalCents)}}</button>
      <button v-else-if="order.status==='unknown'||order.payment==='unknown'||order.totalCents===null" class="primary turquoise" :disabled="syncing" @click="syncOrder">刷新订单状态</button>
      <button v-else class="primary turquoise" @click="showOrders">查看充电记录</button>
    </view>
  </view>
</template>
<script setup>
import {ref,computed} from 'vue';
import {onLoad,onShow,onHide,onUnload} from '@dcloudio/uni-app';
import PageHeader from '../../components/PageHeader.vue';
import DemoNotice from '../../components/DemoNotice.vue';
import ConnectionState from '../../components/ConnectionState.vue';
import {state,action,go,isBackend,connection,refreshData,refreshOrder,operateOrder} from '../../store.js';
import {refreshSession,stopSession,payOrder,yuan,energy} from '../../domain/charging.mjs';
import {isCurrentOrder,orderStatusText} from '../../domain/order-status.mjs';
const id=ref(''),confirming=ref(false),syncing=ref(false);
const order=computed(()=>state.orders.find(o=>o.id===id.value));
onLoad(q=>{id.value=q.id||state.orders.find(isCurrentOrder)?.id||'';});
const serverTime=value=>typeof value==='string'?value.replace('T',' ').slice(0,16):'—';
const date=value=>{if(!Number.isFinite(value))return '—';const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const paymentText=computed(()=>{
  if(!order.value)return '';
  if(order.value.status==='starting')return '正在等待启动结果，尚未结算';
  if(order.value.status==='failed')return '启动失败，未进入支付';
  if(order.value.status==='charging')return '最终金额以结束后的结算结果为准';
  return ({paid:'模拟支付完成',free:'本次无需支付',unpaid:'待模拟支付'})[order.value.payment]||'支付状态待确认';
});
const stop=()=>{
  if(confirming.value||connection.operation)return;
  confirming.value=true;
  uni.showModal({title:'结束充电',content:isBackend?'是否请求结束当前充电？结算结果以平台返回为准。':'提前结束后，将按实际用电量结算。是否结束？',confirmText:'确认结束',
    success:async r=>{if(r.confirm){if(isBackend)await operateOrder(id.value,'stop');else action(()=>stopSession(state,id.value));}},
    complete:()=>{confirming.value=false;}
  });
};
const pay=async()=>{
  if(connection.operation)return;
  const result=isBackend?await operateOrder(id.value,'pay'):action(()=>payOrder(state,id.value));
  if(result?.payment==='paid')uni.showToast({title:'模拟支付成功',icon:'success'});
};
const showOrders=()=>go('/pages/orders/index');
let visible=false,timer=null;
const syncOrder=async()=>{
  if(!isBackend||!visible||!id.value||syncing.value||connection.operation||!connection.user)return;
  syncing.value=true;
  try{await refreshOrder(id.value);}finally{syncing.value=false;}
};
const hide=()=>{visible=false;if(timer)clearInterval(timer);timer=null;};
onShow(async()=>{
  visible=true;
  if(!isBackend){
    const refreshLocal=()=>{if(order.value?.status==='charging')action(()=>refreshSession(state,id.value));};
    refreshLocal();timer=setInterval(refreshLocal,1000);return;
  }
  await refreshData();
  if(!visible)return;
  if(!id.value)id.value=state.orders.find(isCurrentOrder)?.id||'';
  await syncOrder();
  if(visible&&!timer)timer=setInterval(()=>{if(order.value&&isCurrentOrder(order.value))syncOrder();},5000);
});
onHide(hide);onUnload(hide);
</script>
