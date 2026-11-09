<template>
<view class="phone start-page">
<PageHeader title="开始充电" back/>
<ConnectionState/>
<view v-if="station&&device" class="padded-content">
<view v-if="active" class="panel">
<text class="block muted small">已有一笔订单正在充电</text>
<button class="text-button" @click="go('/pages/session/index?id='+active.id)">查看当前充电 ›</button>
</view>
<view class="panel">
<view class="section-row">
<text class="station-name">{{device.name||'双插座充电设备'}}</text>
<button class="small-link" @click="go('/pages/report/index?code='+encodeURIComponent(selected||device.sockets[0]?.code||device.code||device.id))">报修</button>
</view>
<view class="station-address">{{station.name}} · {{device.code||device.id}}</view>
<view class="section-row">
<text class="tag">按电量计费</text>
<text class="muted">空闲<text class="teal big">{{device.online?device.sockets.filter(p=>p.status==='idle').length:0}}</text>/{{device.sockets.length}} 插座</text>
</view>
</view>
<view class="panel port-panel">
<view class="accent-title">充电端口选择</view>
<view class="muted">请选择您连接的插座编号</view>
<view :class="['port-grid',{'dual-port-grid':device.sockets.length===2}]">
<button v-for="p in device.sockets" :key="p.code" :class="['port-button',p.status,{chosen:p.code===selected,unavailable:!device.online}]" :aria-label="p.code+' '+status(p)" @click="choose(p)">
<view class="port-battery">
<text>{{status(p)}}</text>
</view>
<text class="port-number">{{p.label||String(p.number).padStart(2,'0')}}</text>
</button>
</view>
<view class="port-legend">
<text>● 空闲</text>
<text class="orange">● 充电中</text>
<text class="muted">● 故障/离线</text>
</view>
</view>
<view v-if="!isBackend" class="panel">
<view class="accent-title">充电方式</view>
<view class="strategy-grid">
<button v-for="plan in CHARGE_PLANS" :key="plan.id" :class="['strategy',{active:selectedPlan===plan.id}]" :aria-label="'充电方式：'+plan.label" :disabled="starting" @click="selectedPlan=plan.id">
<text>{{plan.label}}</text>
<text class="plan-price">{{planPrice(plan.id)}}</text>
<text class="small">{{plan.description}}</text>
</button>
</view>
<text class="block muted small plan-hint">{{selectedPlan==='FULL'?'充满后自动停止，也可提前结束。':'达到所选时长后自动停止，也可提前结束。'}}费用按实际用电量结算。</text>
</view>
<view v-if="!isBackend" class="panel">
<view class="accent-title">计费标准 <text class="tag">按电量计费</text>
</view>
<view class="rate-columns">
<view>
<text class="rate-value">{{yuan(station.rates.electricity)}}元</text>
<text>电费 / kWh</text>
</view>
<view>
<text class="rate-value">{{yuan(station.rates.service)}}元</text>
<text>服务费 / kWh</text>
</view>
</view>
<view class="muted small">以启动时的费率为准，充电结束后按实际用电量结算。</view>
</view>
<view v-if="!isBackend" class="panel">
<view class="accent-title">支付方式</view>
<view class="payment-option">
<text class="wallet-symbol">▣</text>
<view>
<text>模拟支付</text>
<text class="muted small block">结束后确认，不充值、不扣款</text>
</view>
<text class="check-circle">✓</text>
</view>
</view>
<view v-if="isBackend" class="panel">
<BackendRates :station="station"/>
<text v-if="!connection.user?.features?.bikeCharging" class="block field-error">当前后台版本暂不支持启动，请联系管理员更新。</text>
<text v-else class="block muted small">电量由平台模拟计量，启动后保存本次费率，结束时结算。</text>
</view>
<DemoNotice/>
</view>
<view v-else class="empty-state">设备不存在<text>请重新选择站点或输入插座编号</text>
<button class="primary turquoise" @click="go('/pages/home/index')">返回找站</button>
</view>
<view class="action-bar">
<view v-if="!isBackend" class="start-summary">
<text class="muted">{{selectedEstimate?'预计金额':'充满自停'}}</text>
<text v-if="selectedEstimate" class="price-orange">¥{{yuan(selectedEstimate.totalCents)}}</text>
<text v-else class="settlement-label">按实际用电结算</text>
</view>
<button class="primary turquoise" :disabled="!canStart || starting" :loading="starting" @click="start">{{starting?'正在启动':isBackend&&!connection.user?.features?.bikeCharging?'启动暂未开放':'开始充电'}}</button>
</view>
</view>
</template>
<script setup>
import {ref,computed} from 'vue';import {onLoad,onShow} from '@dcloudio/uni-app';import PageHeader from '../../components/PageHeader.vue';import DemoNotice from '../../components/DemoNotice.vue';import {state,action,go,isBackend,refreshData,loadRates,connection,startBackend} from '../../store.js';import {startSession,yuan,isDeviceAvailable,CHARGE_PLANS,estimatePlanCost} from '../../domain/charging.mjs';
import ConnectionState from '../../components/ConnectionState.vue';import BackendRates from '../../components/BackendRates.vue';import {isCurrentOrder} from '../../domain/order-status.mjs';
const selectedPlan=ref('FULL');
const stationId=ref(''),deviceId=ref(''),selected=ref(''),starting=ref(false),requestedSocket=ref('');const station=computed(()=>state.stations.find(s=>s.id===stationId.value));const device=computed(()=>station.value?.devices.find(d=>d.id===deviceId.value));
const selectedEstimate=computed(()=>!isBackend&&station.value?estimatePlanCost(station.value.rates,selectedPlan.value):null);
const planPrice=id=>{const estimate=station.value?estimatePlanCost(station.value.rates,id):null;return estimate?'约¥'+yuan(estimate.totalCents):'按实际用电结算';};
onLoad(q=>{stationId.value=q.station;deviceId.value=q.device;requestedSocket.value=q.socket||'';if(q.socket&&device.value?.online&&device.value.sockets.some(p=>p.code===q.socket&&p.status==='idle'))selected.value=q.socket;});
const active=computed(()=>state.orders.find(isCurrentOrder));
const canStart=computed(()=>(!isBackend||connection.user?.features?.bikeCharging)&&!connection.loading&&!connection.operation&&!active.value&&station.value&&device.value&&isDeviceAvailable(station.value,device.value)&&device.value.sockets.some(p=>p.code===selected.value&&p.status==='idle'));
const status=p=>station.value?.enabled===false||device.value?.enabled===false?'停用':!device.value?.online?'离线':({idle:'空闲',charging:'充电中',fault:'故障',disabled:'停用',unknown:'不可用'}[p.status]||'不可用');
const choose=p=>{if(!isDeviceAvailable(station.value,device.value)||p.status!=='idle')return uni.showToast({title:'该插座'+status(p)+'，请选择空闲插座',icon:'none'});selected.value=p.code;};
onShow(async()=>{await refreshData();if(isBackend&&station.value){if(!selected.value&&device.value&&isDeviceAvailable(station.value,device.value)&&device.value.sockets.some(p=>p.code===requestedSocket.value&&p.status==='idle'))selected.value=requestedSocket.value;await loadRates(stationId.value);}});
const start=()=>{
  if(!canStart.value||starting.value)return;
  starting.value=true;
  uni.showModal({title:'确认开始充电',content:'插座 '+selected.value+(isBackend?'':' · '+CHARGE_PLANS.find(p=>p.id===selectedPlan.value).label+(selectedEstimate.value?'，预计¥'+yuan(selectedEstimate.value.totalCents):'，按实际用电结算'))+'，请确认已连接正确插座。',confirmText:'确认启动',
    success:async r=>{
      if(!r.confirm){starting.value=false;return;}
      try{
        const socket=device.value.sockets.find(p=>p.code===selected.value);
        const order=isBackend?await startBackend(station.value.id,socket.id):action(()=>startSession(state,selected.value,Date.now(),selectedPlan.value));
        if(order)uni.redirectTo({url:'/pages/session/index?id='+order.id});
      }finally{starting.value=false;}
    },fail:()=>{starting.value=false;}
  });
};
</script>

<style scoped>
.port-grid.dual-port-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.strategy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.strategy{width:100%;min-width:0;min-height:76px;padding:12px 4px;border:1px solid #eeeef2;background:#f8f8fa;color:#555;font-size:17px;font-weight:600;border-radius:8px}
.strategy.active{border-color:#23cbd1;background:#23cbd1;color:#fff;font-size:17px}
.strategy .small{font-size:11px;font-weight:400}
.plan-price{font-size:13px;font-weight:500;line-height:1.7}
.settlement-label{font-size:14px;color:#ed9f36;line-height:1.7}
.plan-hint{margin-top:12px;line-height:1.7}
@media(max-width:350px){.strategy-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
