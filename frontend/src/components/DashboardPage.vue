<script setup>
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import ChartPanel from './ChartPanel.vue'
import StatusTag from './StatusTag.vue'
import DashboardStationMap from './DashboardStationMap.vue'
import DashboardOperatorFilter from './DashboardOperatorFilter.vue'
import DashboardDateFilter from './DashboardDateFilter.vue'
import {dashboardRange,inDashboardRange,dashboardRangeForSource} from '../domain/dashboardPeriod.js'
import OrderTrendCard from './OrderTrendCard.vue'
import { buildDashboardView } from '../domain/dashboardView.js'
const props=defineProps({source:{type:Object,required:true},operators:{type:Array,default:()=>[]},platformAdmin:Boolean})
const dashboardOperator=ref('')
const view=computed(()=>buildDashboardView(props.source,dashboardOperator.value))
const db=computed(()=>view.value.data)
const devicesView=computed(()=>view.value.devices),socketsView=computed(()=>view.value.sockets)
import { money, today } from '../domain/service.js'
import { userTrend, feeTrend, typeChart, siteChart } from '../domain/statistics.js'
const emit=defineEmits(['open-device','navigate','message'])
const dateRange=ref(dashboardRange('sixMonths')),period=ref('sixMonths'),noticeTab=ref('report'),reversed=ref(false),selectedRow=ref('D2')
const chartRange=computed(()=>dashboardRangeForSource(db.value,dateRange.value))
const periodLabel=computed(()=>({today:'今日',week:'近七天',month:'近一个月',sixMonths:'近六个月',all:'累计',custom:'期间'})[period.value])
const metricRows=computed(()=>{
 const orders=db.value.orders.filter(o=>inDashboardRange(o.startedAt,dateRange.value)),settled=db.value.orders.filter(o=>o.status==='ended'&&inDashboardRange(o.endedAt||o.startedAt,dateRange.value))
 return [
  ...(props.platformAdmin?[{label:'运营商数量（家）',value:dashboardOperator.value?1:props.operators.length,icon:'system',tone:'purple'}]:[]),
  {label:'站点总数（个）',value:db.value.stations.length,icon:'system',tone:'blue'},
  {label:'设备总数（台）',value:db.value.devices.length,icon:'device',tone:'pink'},
  {label:'空闲插座（个）',value:socketsView.value.filter(s=>s.status==='空闲').length,icon:'battery',tone:'orange'},
  {label:`${periodLabel.value}订单（单）`,value:orders.length,icon:'receipt',tone:'cyan'},
  {label:`${periodLabel.value}结算金额（元）`,value:money(settled.reduce((n,o)=>n+o.total,0)),icon:'consume',tone:'green'},
  {label:'待处理报修（条）',value:db.value.reports.filter(r=>r.status==='pending').length,icon:'edit',tone:'purple'},
  {label:'异常设备（台）',value:devicesView.value.filter(d=>!d.online||d.faults).length,icon:'rule',tone:'gold'},
 ]
})
const users=computed(()=>userTrend(view.value.data.users,chartRange.value)),fees=computed(()=>feeTrend(view.value.data.orders,chartRange.value)),types=computed(()=>typeChart(view.value.devices)),sites=computed(()=>siteChart(view.value.stations))
const rows=computed(()=>{const a=view.value.devices.slice(0,10);return reversed.value?a.reverse():a})
const reportCount=computed(()=>view.value.data.reports.filter(r=>r.status==='pending').length)
const alarmRows=computed(()=>[...view.value.data.devices.filter(d=>!d.online).map(d=>({text:`${d.code} 设备离线，异常任务需核验`,stationId:d.stationId,time:'设备状态'})),...view.value.sockets.filter(s=>s.fault).map(s=>({text:`${s.code} ${s.faultReason}`,stationId:s.station?.id,time:'插座状态'}))])
const notices=computed(()=>noticeTab.value==='report'?view.value.reports.filter(r=>r.status==='pending').map(r=>({text:`${r.socket?.station?.name}：${r.description}`,stationId:r.socket?.station?.id,time:r.createdAt.slice(11,16)})):alarmRows.value)
const faults=computed(()=>{
 const groups=new Map();view.value.sockets.filter(s=>s.fault).forEach(s=>groups.set(s.faultReason,(groups.get(s.faultReason)||0)+1));const offline=view.value.data.devices.filter(d=>!d.online).length;if(offline)groups.set('设备离线',offline)
 const palette=[['#ffc3aa','#f5e8e9'],['#ffa7c3','#f7f0fa'],['#baaaff','#e6e0ff'],['#91cdf5','#c5e4fa']];const max=Math.max(...groups.values(),1)
 return [...groups].map(([name,value],i)=>({name,value,width:value/max*64,color:palette[i%4][0],end:palette[i%4][1]}))
})
function openReminders(){emit('navigate',noticeTab.value==='report'?'reports':'devices')}
function exportStats(){const content='\uFEFF指标,数值,数据来源\r\n'+metricRows.value.map(m=>`${m.label},${m.value},浏览器本地演示数据`).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download='充电管理统计-本地演示.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);emit('message','已导出当前业务统计。')}
</script>
<template>
 <div class="overview-total"><div>设备总数：<strong>{{db.devices.length}}</strong> 台 <span>插座总数：<strong>{{db.sockets.length}}</strong> 个</span></div><span class="preview-label">软件模拟 · {{today()}}</span></div>
 <section class="dashboard-glass" aria-label="运营统计">
  <div class="scope-toolbar"><DashboardOperatorFilter v-if="platformAdmin" v-model="dashboardOperator" :operators="operators" label="运营商"/><DashboardDateFilter v-model="dateRange" @period="period=$event"/><button class="soft-button export-button" @click="exportStats">导出</button></div>
  <div class="metric-grid"><article v-for="metric in metricRows" :key="metric.label" class="metric-card"><div class="metric-icon" :class="metric.tone"><UiIcon :name="metric.icon" size="2rem"/></div><div class="metric-copy"><p>{{metric.label}}</p><strong>{{metric.value}}</strong></div></article></div>
  <DashboardStationMap :source="db" @navigate="emit('navigate',$event)"/>
  <div class="statistics-grid">
   <OrderTrendCard :source="db" :range="chartRange"/>
   <section class="plot-card announcements-card"><div class="announcement-heading"><div class="notice-tabs"><button :class="{active:noticeTab==='report'}" @click="noticeTab='report'">报修({{reportCount}})</button><button :class="{active:noticeTab==='alarm'}" @click="noticeTab='alarm'">告警({{alarmRows.length}})</button></div><button class="text-button" @click="openReminders">查看更多</button></div><ul class="announcement-list"><li v-for="(item,i) in notices.slice(0,6)" :key="i"><button @click="emit('navigate',{page:noticeTab==='report'?'reports':'devices',stationId:item.stationId})"><i></i><span>{{item.text}}</span><time>{{item.time}}</time></button></li><li v-if="!notices.length" class="dashboard-empty">暂无待处理{{noticeTab==='report'?'报修':'告警'}}</li></ul></section>
   <section class="plot-card users-card"><div class="plot-heading"><h2>用户增长统计</h2></div><ChartPanel :option="users" label="根据注册时间统计的用户增长趋势"/></section>
   <section class="plot-card type-card"><div class="plot-heading"><h2 class="small-heading">设备状态占比</h2></div><ChartPanel :option="types" label="双插座设备的运行状态占比"/></section>
   <section class="plot-card recharge-card"><div class="plot-heading"><h2>充电费用统计</h2></div><ChartPanel :option="fees" label="已结束订单电费与服务费趋势，单位元"/></section>
   <section class="plot-card faults-card"><div class="plot-heading"><h2 class="small-heading">设备与插座异常</h2></div><div class="fault-list"><div v-for="fault in faults" :key="fault.name" class="fault-row"><span class="fault-name">{{fault.name}}</span><div class="fault-bar" :style="{width:`${fault.width}%`,background:`linear-gradient(90deg,${fault.color},${fault.end})`}"></div><span class="fault-value" :style="{color:fault.color}">{{fault.value}} {{fault.name==='设备离线'?'台':'个'}}</span></div><p v-if="!faults.length" class="dashboard-empty">当前无异常设备或故障插座</p></div></section>
   <section class="plot-card device-statistics-card"><div class="plot-heading"><h2>设备统计</h2><button class="text-button" @click="emit('navigate','devices')">全部设备</button></div><div class="device-table-wrap"><table class="device-table"><thead><tr><th><button class="table-sort" @click="reversed=!reversed">序号<span class="sort-arrows"><i></i><i></i></span></button></th><th>设备编号</th><th>插座总数</th><th>结算金额</th><th>模拟电量</th><th>已结束订单</th><th>空闲插座</th><th>设备状态</th></tr></thead><tbody><tr v-for="(row,i) in rows" :key="row.id" :class="{selected:selectedRow===row.id}" @click="selectedRow=row.id"><td>{{i+1}}</td><td><button class="table-link" @click.stop="emit('open-device',row.id)">{{row.code}}</button></td><td>{{row.portCount}}</td><td>{{money(row.amount)}}</td><td>{{row.energy.toFixed(3)}}</td><td>{{row.times}}</td><td>{{row.free}}</td><td><StatusTag :text="row.status"/></td></tr><tr v-if="!rows.length"><td colspan="8">暂无设备，请先添加站点和设备</td></tr></tbody></table></div></section>
   <section class="plot-card community-card"><div class="plot-heading"><h2 class="small-heading">站点插座分布</h2></div><ChartPanel :option="sites" label="各站点插座数量及占比"/></section>
  </div>
 </section><footer class="page-footer">电动自行车智慧充电管理系统 · 本地前端演示 · 非实际设备或计量数据</footer>
</template>

<style scoped>
.scope-toolbar{gap:16px;flex-wrap:wrap}.metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:1000px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){.metric-grid{grid-template-columns:1fr}}.plot-heading{height:auto;min-height:42px;padding:12px 20px;flex-wrap:wrap;gap:10px}.device-table-wrap{overflow:auto}@media(max-width:540px){.device-table{min-width:640px}}
</style>
