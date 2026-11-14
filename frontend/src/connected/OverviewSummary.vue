<script setup>
import {computed} from 'vue'
import {overviewMetrics,activeAlerts} from '../domain/operations.js'
const props=defineProps({source:Object,loaded:Boolean})
const emit=defineEmits(['navigate','device','order'])
const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const metrics=computed(()=>overviewMetrics(props.source,date()))
const cards=computed(()=>[
 {label:'今日启动订单',value:metrics.value.orders,unit:'单',target:{page:'orders',date:date()}},
 {label:'今日已结算电量',value:metrics.value.energy.toFixed(3),unit:'kWh',target:{page:'orders',date:date(),completedOnly:true}},
 {label:'今日结算账单',value:metrics.value.amount.toFixed(2),unit:'元',target:{page:'orders',date:date(),completedOnly:true}},
 {label:'当前空闲插座',value:metrics.value.free,unit:'个',target:{page:'devices'}},
 {label:'待处理报修',value:metrics.value.pendingRepairs,unit:'条',target:{page:'reports',repairStatus:'OPEN'}},
 {label:'当前异常设备',value:metrics.value.abnormalDevices,unit:'台',target:{page:'devices',abnormalOnly:true}},
])
const alerts=computed(()=>activeAlerts(props.source).slice(0,4))
const reports=computed(()=>props.source.reports.filter(r=>r.status==='OPEN').slice(0,4))
</script>
<template><section class="overview-summary" aria-label="运营概览核心指标">
 <p class="overview-resource">资源概况：{{source.stations.length}} 个站点 · {{source.devices.length}} 台设备 · {{source.sockets.length}} 个插座</p>
 <div class="overview-cards"><button v-for="card in cards" :key="card.label" class="overview-card" :disabled="!loaded||card.value===null" @click="emit('navigate',card.target)"><span>{{card.label}}</span><strong>{{loaded&&card.value!==null?card.value:'—'}}<small>{{card.unit}}</small></strong><span class="overview-card-link">{{card.value===null?'报修数据未读取':'查看记录 →'}}</span></button></div>
 <p class="overview-caption">今日统计按订单开始日期归属，仅合计已结束账单，不等同实收；空闲插座与异常设备为当前状态。{{metrics.missingBills?'存在历史金额缺失记录，未计入合计。':''}}</p>
 <div class="overview-todos"><section><header><h2>报修待办</h2><button class="text-button" @click="emit('navigate',{page:'reports',repairStatus:'OPEN'})">查看待处理</button></header><p v-if="!source.reportsLoaded">报修数据未读取，请刷新或检查接口权限。</p><p v-else-if="!reports.length">暂无待处理报修</p><button v-for="r in reports" :key="r.id" class="overview-todo" @click="emit('navigate',{page:'reports',stationId:r.stationId,repairId:r.id})"><strong>{{r.stationName||'站点 #'+r.stationId}}</strong><span>{{r.description}}</span></button></section><section><header><h2>设备异常</h2><button class="text-button" @click="emit('navigate',{page:'operations'})">全部告警</button></header><p v-if="!alerts.length">当前没有设备异常待办</p><button v-for="a in alerts" :key="a.key" class="overview-todo" @click="a.orderId?emit('order',a.orderId):a.deviceId?emit('device',a.deviceId):emit('navigate',{page:'operations'})"><strong>{{a.title}}</strong><span>{{a.body}}</span></button></section></div>
</section></template>
<style scoped>
.overview-summary{padding:1.5rem}.overview-resource,.overview-caption{font-size:.85rem;color:#746d84;line-height:1.7}.overview-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.overview-card{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:22px;background:#fff;border:1px solid #e9e5ef;border-radius:12px;text-align:left;color:inherit;min-width:0;cursor:pointer}.overview-card:hover:not(:disabled){border-color:#8b7bce;box-shadow:0 5px 18px #7568d512}.overview-card:disabled{cursor:default}.overview-card strong{font-size:1.85rem;color:#6655a0}.overview-card small{font-size:.75rem;font-weight:400;margin-left:8px}.overview-card-link{font-size:.75rem;color:#897baf}.overview-todos{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.overview-todos section{background:white;border:1px solid #e9e5ef;border-radius:12px;padding:18px;min-width:0}.overview-todos header{display:flex;align-items:center;justify-content:space-between}.overview-todos h2{font-size:1rem}.overview-todos p{font-size:.85rem;color:#82798c}.overview-todo{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #f0edf4;padding:13px 0;color:inherit;cursor:pointer}.overview-todo strong{font-size:.85rem;flex-shrink:0}.overview-todo span{font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:900px){.overview-cards{grid-template-columns:1fr 1fr}.overview-todos{grid-template-columns:1fr}}
</style>
