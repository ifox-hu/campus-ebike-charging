<script setup>
import {computed,ref} from 'vue'
import ChartPanel from './ChartPanel.vue'
import {orderTrend,recentDates} from '../domain/statistics.js'
const props=defineProps({source:{type:Object,required:true},range:Object})
const period=ref('7'),start=ref(''),end=ref(''),range=ref(null),error=ref('')
const dates=computed(()=>props.range||range.value||{start:recentDates(Number(period.value)||7)[0],end:recentDates(1)[0]})
const option=computed(()=>orderTrend(props.source.orders,dates.value))
function changePeriod(){error.value='';if(period.value!=='custom')range.value=null}
function apply(){try{orderTrend([], {start:start.value,end:end.value});range.value={start:start.value,end:end.value};error.value=''}catch(e){error.value=e.message}}
</script>
<template><section class="plot-card sales-card order-trend-card"><div class="plot-heading"><h2>充电订单趋势</h2></div><form v-if="!props.range" class="trend-controls" @submit.prevent="apply"><label>时间范围 <select v-model="period" aria-label="订单趋势时间范围" @change="changePeriod"><option value="7">近7天</option><option value="30">近30天</option><option value="custom">自定义日期</option></select></label><template v-if="period==='custom'"><input v-model="start" type="date" aria-label="订单趋势开始日期"/><span>至</span><input v-model="end" type="date" aria-label="订单趋势结束日期"/><button class="soft-button" type="submit">查询</button></template><span class="trend-range" data-testid="order-trend-range">{{dates.start}} 至 {{dates.end}}</span></form><p v-if="props.range" class="trend-controls" data-testid="order-trend-range">{{dates.start}} 至 {{dates.end}}</p><p v-if="error" role="alert" class="trend-error">{{error}}</p><ChartPanel :option="{...option,legend:{type:'scroll',top:0,itemWidth:10,itemHeight:8,textStyle:{fontSize:10,color:'#888'}}}" label="充电订单趋势：订单数量与充电状态统计"/></section></template>
<style scoped>
.order-trend-card{height:auto;min-height:340px}.order-trend-card :deep(.chart-canvas){min-height:220px}.order-trend-card .plot-heading{height:auto;min-height:54px;padding-top:14px;padding-bottom:12px;gap:12px;flex-wrap:wrap}.trend-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:0 24px 12px;color:#777;font-size:12px}.trend-controls label{display:flex;gap:8px;align-items:center}.trend-controls select,.trend-controls input{padding:7px 9px;border:1px solid #e3e1ed;border-radius:7px;background:#fff;color:#514c67;font:inherit;max-width:150px}.trend-range{margin-left:auto;color:#999}.trend-error{margin:0 24px;color:#c34b55;font-size:12px}
</style>
