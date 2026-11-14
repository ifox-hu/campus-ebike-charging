<template>
  <view class="phone start-page">
    <PageHeader title="开始充电" back/>
    <ConnectionState/>
    <view v-if="station&&device" class="padded-content">
      <view v-if="active" class="panel active-notice"><text>已有一笔订单正在充电</text><button class="text-button" @click="go('/pages/session/index?id='+active.id)">查看当前充电 ›</button></view>
      <view class="panel equipment-summary">
        <view class="section-row"><text class="station-name">{{station.name}}</text><button class="small-link" @click="go('/pages/report/index?code='+encodeURIComponent(selected||device.sockets[0]?.code||device.code||device.id))">报修</button></view>
        <text class="block muted small">{{device.name||'双插座充电设备'}} · {{device.code||device.id}}</text>
        <view class="equipment-tags"><text class="tag">仅收电费</text><text class="small muted">按本次电价与用电量结算</text></view>
      </view>
      <view class="panel port-panel">
        <view class="section-row"><view class="accent-title">选择插座</view><text class="small muted">请核对设备上的编号</text></view>
        <view :class="['port-grid',{'dual-port-grid':device.sockets.length===2}]">
          <button v-for="p in device.sockets" :key="p.code" :class="['port-button',p.status,{chosen:p.code===selected,unavailable:!device.online}]" :aria-label="p.code+' '+status(p)" :disabled="starting" @click="choose(p)">
            <view class="port-battery"><text>{{status(p)}}</text></view><text class="port-number">{{p.label||String(p.number).padStart(2,'0')}}</text><text v-if="p.powerWatts" class="block small">{{p.powerWatts}} W</text>
          </button>
        </view>
        <view class="port-legend"><text>● 空闲</text><text class="orange">● 充电中</text><text class="muted">● 故障/离线</text></view>
        <view class="selected-socket"><view><text class="block small muted">{{selected?'已选插座':'等待选择'}}</text><text class="socket-code">{{selected||'请选择空闲插座'}}</text></view><text class="socket-power">{{socketPower===null?'—':socketPower+' W'}}</text></view>
        <text class="block muted small">功率为配置值，非设备实时读数。</text>
      </view>
      <view class="panel plan-panel">
        <view class="section-row"><view class="accent-title">充电方式</view><text class="small muted">可提前手动结束</text></view>
        <view class="plan-grid">
          <button v-for="minutes in [60,120,180]" :key="minutes" :class="['plan-card',{chosen:!fullMode&&!customDuration&&durationPreset===minutes}]" :disabled="starting" @click="fullMode=false;customDuration=false;durationPreset=minutes"><text class="plan-name">{{minutes/60}} 小时</text><text class="plan-note">到时自动停止</text><text v-if="!fullMode&&!customDuration&&durationPreset===minutes" class="plan-tick">✓</text></button>
          <button :class="['plan-card',{chosen:fullMode}]" :disabled="starting||!supportsFull" @click="fullMode=true;customDuration=false"><text class="plan-name">充满自停<text class="simulation-badge">模拟</text></text><text class="plan-note">模拟低功率结束</text><text v-if="fullMode" class="plan-tick">✓</text></button>
          <button :class="['plan-card','custom-plan',{chosen:customDuration&&!fullMode}]" :disabled="starting" @click="fullMode=false;customDuration=true"><text class="plan-name">自定义时长</text><text class="plan-note">1—720 分钟，按需选择</text><text v-if="customDuration&&!fullMode" class="plan-tick">✓</text></button>
        </view>
        <view v-if="customDuration&&!fullMode" class="duration-custom"><input v-model="customMinutes" type="number" placeholder="输入 1—720" :disabled="starting" aria-label="自定义充电分钟数"/><text>分钟</text></view>
        <text v-if="!durationValid" class="field-error block">{{fullMode?'当前后端未开放充满自停模拟':'请输入 1—720 的整数分钟。'}}</text>
        <view class="plan-explanation"><text class="explanation-title">{{fullMode?'充满自停演示':'按实际用电结算'}}</text><text>{{fullMode?'按预设曲线模拟：先正常充电，再降至低功率保持 5 分钟后结束。演示约 215 分钟，不检测真实电池电量。':'到达所选时长后自动结束，也可随时提前结束。仅收电费，不收服务费。'}}</text></view>
        <text v-if="!supportsFull" class="block muted small">充满自停模拟需新版软件计量后端，当前暂不可用。</text>
      </view>
      <view class="panel">
        <view class="section-row"><view class="accent-title">支付方式</view><text class="tag">毕设演示</text></view>
        <PaymentChoices v-model="paymentMethod" :disabled="starting"/>
        <text class="block muted small payment-hint">充电结束后确认模拟支付，不会调用真实收款。</text>
        <text v-if="!supportsMock" class="block muted small">当前后端未启用模拟支付，订单结束后可使用支付宝沙箱。</text>
      </view>
      <view class="panel">
        <BackendRates v-if="isBackend" :station="station"/>
        <view v-else><view class="accent-title">电费标准</view><view class="electricity-rate"><text class="rate-value">¥{{yuan(station.rates.electricity)}}<text class="small"> / 度</text></text><text class="small muted">仅收电费 · 启动时保存电价</text></view></view>
        <text v-if="isBackend&&!connection.user?.features?.bikeCharging" class="block field-error">当前后台版本暂不支持启动，请联系管理员更新。</text>
      </view>
    </view>
    <view v-else class="empty-state">设备不存在<text>请重新选择站点或输入插座编号</text><button class="primary turquoise" @click="go('/pages/home/index')">返回找站</button></view>
    <view class="action-bar"><view class="start-summary"><text class="muted small">{{selected?'已选择充电插座':'请先选择插座'}}</text><text class="summary-plan">{{planLabel}}</text></view><button class="primary turquoise" :disabled="!canStart||starting" :loading="starting" @click="start">{{starting?'正在启动':'开始充电'}}</button></view>
  </view>
</template>
<script setup>
import {ref,computed} from 'vue';import {onLoad} from '@dcloudio/uni-app';import PageHeader from '../../components/PageHeader.vue';import {state,action,go,isBackend,refreshData,loadRates,connection,startBackend} from '../../store.js';import {startSession,yuan,isDeviceAvailable,chargingPower,paymentMethods} from '../../domain/charging.mjs';
import PaymentChoices from '../../components/PaymentChoices.vue';
import {useCatalogSync} from '../../use-catalog-sync.js';
import ConnectionState from '../../components/ConnectionState.vue';import BackendRates from '../../components/BackendRates.vue';import {isCurrentOrder} from '../../domain/order-status.mjs';
const stationId=ref(''),deviceId=ref(''),selected=ref(''),starting=ref(false),requestedSocket=ref('');const station=computed(()=>state.stations.find(s=>s.id===stationId.value));const device=computed(()=>station.value?.devices.find(d=>d.id===deviceId.value));
onLoad(q=>{stationId.value=q.station;deviceId.value=q.device;requestedSocket.value=q.socket||'';if(q.socket&&device.value?.online&&device.value.sockets.some(p=>p.code===q.socket&&p.status==='idle'))selected.value=q.socket;});
const paymentMethod=ref('wechat');
const fullMode=ref(false);
const supportsFull=computed(()=>!isBackend||connection.user?.features?.fullChargeSimulation===true);
const supportsMock=computed(()=>!isBackend||connection.user?.features?.mockPayment===true);
const durationPreset=ref(120),customDuration=ref(false),customMinutes=ref('');
const durationMinutes=computed(()=>customDuration.value?Number(customMinutes.value):durationPreset.value);
const durationValid=computed(()=>fullMode.value?supportsFull.value:Number.isInteger(durationMinutes.value)&&durationMinutes.value>=1&&durationMinutes.value<=720);
const planLabel=computed(()=>fullMode.value?'充满自停（模拟）':durationMinutes.value+' 分钟');
const socketPower=computed(()=>chargingPower(device.value?.sockets.find(p=>p.code===selected.value),device.value));
const active=computed(()=>state.orders.find(isCurrentOrder));
const canStart=computed(()=>durationValid.value&&(!isBackend||connection.user?.features?.bikeCharging)&&(!isBackend||station.value?.ratePeriods?.length)&&!connection.loading&&!connection.operation&&!active.value&&station.value&&device.value&&isDeviceAvailable(station.value,device.value)&&device.value.sockets.some(p=>p.code===selected.value&&p.status==='idle'));
const status=p=>station.value?.enabled===false||device.value?.enabled===false?'停用':!device.value?.online?'离线':({idle:'空闲',charging:'充电中',fault:'故障',disabled:'停用',unknown:'不可用'}[p.status]||'不可用');
const choose=p=>{if(!isDeviceAvailable(station.value,device.value)||p.status!=='idle')return uni.showToast({title:'该插座'+status(p)+'，请选择空闲插座',icon:'none'});selected.value=p.code;};
useCatalogSync(async()=>{await refreshData();if(isBackend&&station.value){if(!selected.value&&device.value&&isDeviceAvailable(station.value,device.value)){const candidate=requestedSocket.value?device.value.sockets.find(p=>p.code===requestedSocket.value&&p.status==='idle'):device.value.sockets.find(p=>p.status==='idle');if(candidate)selected.value=candidate.code;}await loadRates(stationId.value);}});
const start=()=>{
  if(!canStart.value||starting.value)return;
  starting.value=true;
  uni.showModal({title:'确认开始充电',content:'插座 '+selected.value+' · '+planLabel.value+'。'+(fullMode.value?'按预设功率曲线模拟充满结束，不检测真实电池电量。':'到时自动结束。')+'仅收电费。',confirmText:'确认启动',
    success:async r=>{
      if(!r.confirm){starting.value=false;return;}
      try{
        const socket=device.value.sockets.find(p=>p.code===selected.value);
        const order=isBackend?await startBackend(station.value.id,socket.id,fullMode.value?null:durationMinutes.value,fullMode.value?'FULL':'TIMED',paymentMethod.value):action(()=>startSession(state,selected.value,Date.now(),paymentMethod.value,fullMode.value?null:durationMinutes.value,fullMode.value?'FULL':'TIMED'));
        if(order)uni.redirectTo({url:'/pages/session/index?id='+order.id});
      }finally{starting.value=false;}
    },fail:()=>{starting.value=false;}
  });
};
</script>
<style scoped>
.equipment-tags{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px}.equipment-summary .station-name{font-size:18px;color:#24383f}.port-grid.dual-port-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.selected-socket{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 0 10px;border-top:1px solid #f0f3f4;margin-top:12px}.socket-code{font-size:14px;font-weight:600;color:#344d54;word-break:break-all}.socket-power{font-size:21px;font-weight:650;color:#17b6c1;white-space:nowrap}.plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}.plan-card{position:relative;display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0;min-height:80px;padding:15px 12px!important;background:#f8fafb!important;border:1px solid #e9eef0!important;border-radius:12px!important;text-align:left;line-height:1.5}.plan-card.chosen{background:#ecfbfb!important;border-color:#21bfca!important}.plan-name{font-size:17px;font-weight:650;color:#283e45}.chosen .plan-name{color:#0b9ba7}.plan-note{font-size:11px;color:#7b8f96}.custom-plan{grid-column:1/-1;min-height:66px;flex-direction:row;align-items:center;justify-content:space-between;padding-right:32px!important}.plan-tick{position:absolute;right:8px;bottom:6px;color:#10adb9;font-size:15px}.simulation-badge{display:inline-block;vertical-align:middle;margin-left:5px;padding:1px 4px;font-size:9px;font-weight:400;border-radius:4px;background:#dff4f3;color:#129c9e}.duration-custom{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #d5e8e9;border-radius:10px;margin-bottom:12px}.duration-custom input{flex:1;min-width:0;height:28px}.plan-explanation{padding:12px 14px;border-radius:10px;background:#f7f9fa;font-size:11px;color:#71858b;line-height:1.8}.plan-explanation text{display:block}.explanation-title{color:#47646c;font-size:12px;font-weight:600;margin-bottom:4px}.payment-hint{margin-top:12px;line-height:1.7}.electricity-rate{display:flex;flex-direction:column;gap:8px;padding-top:12px}.rate-value{font-size:26px;font-weight:650;color:#15aeba}.summary-plan{display:block;font-size:15px;font-weight:650;color:#25454b}.active-notice{display:flex;align-items:center;justify-content:space-between;font-size:12px}.start-summary{width:auto;flex:1;min-width:0}.action-bar .primary{flex:1;max-width:210px}
@media(max-width:350px){.plan-card{padding:13px 9px!important}.plan-name{font-size:15px}.simulation-badge{font-size:9px;margin-left:3px}.custom-plan .plan-note{font-size:10px}.summary-plan{font-size:13px}.socket-power{font-size:18px}}
</style>