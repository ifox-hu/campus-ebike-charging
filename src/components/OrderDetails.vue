<script setup>
import {computed,ref} from 'vue'
import {api,ordersView} from '../domain/store.js'
import {money,orderLabels,payLabels} from '../domain/service.js'
import StatusTag from './StatusTag.vue'
const props=defineProps({id:String}),emit=defineEmits(['message'])
const order=computed(()=>ordersView.value.find(o=>o.id===props.id))
const reason=ref(''),verified=ref(false),error=ref(''),failureReason=ref('模拟设备拒绝启动')
function run(action){error.value='';try{action();emit('message','演示订单已更新，工作台同步刷新。')}catch(e){error.value=e.message}}
</script>
<template>
<div v-if="order" class="order-detail-content">
 <p class="form-hint">软件模拟订单；不控制实物设备，不发生真实付款。</p>
 <div class="order-state-line"><StatusTag :text="orderLabels[order.status]"/><StatusTag :text="payLabels[order.payStatus]"/><strong>{{order.number}}</strong></div>
 <dl class="detail-grid">
  <dt>充电用户</dt><dd>{{order.user?.name}}</dd><dt>站点快照</dt><dd>{{order.stationName}}</dd>
  <dt>设备排</dt><dd>{{order.rowName||'早期演示未记录排号'}}</dd><dt>设备 / 插座</dt><dd>{{order.deviceCode}} / {{order.socketCode}}</dd>
  <dt>{{['starting','failed'].includes(order.status)?'请求时间':'开始时间'}}</dt><dd>{{order.startedAt}}</dd><dt>结束时间</dt><dd>{{order.endedAt||'尚未结束'}}</dd>
  <dt>模拟时长</dt><dd>{{order.minutes}} 分钟</dd><dt>模拟电量</dt><dd>{{order.energy.toFixed(3)}} 度</dd>
 </dl>
 <div class="fee-breakdown">
  <div><span>电费：{{order.electricRate.toFixed(2)}} 元/度 × {{order.energy.toFixed(3)}} 度</span><strong>¥ {{money(order.electricFee)}}</strong></div>
  <div><span>服务费：{{order.serviceRate.toFixed(2)}} 元/度 × {{order.energy.toFixed(3)}} 度</span><strong>¥ {{money(order.serviceFee)}}</strong></div>
  <div class="fee-total"><span>{{['starting','charging'].includes(order.status)?'当前估算费用':'订单费用'}}</span><strong>¥ {{money(order.total)}}</strong></div>
 </div>
 <p class="form-hint">使用订单请求启动时保存的费率；当前规则修改不会覆盖此快照。</p>
 <p v-if="order.reason" class="order-reason">处理 / 结束原因：{{order.reason}}</p>
 <p v-if="error" class="form-error" role="alert">{{error}}</p>
 <div v-if="order.status==='starting'" class="start-feedback">
  <h3>等待模拟设备反馈</h3><p class="form-hint">已占用本插座；反馈成功后才开始模拟计量。失败不产生费用。</p>
  <label>失败原因<input v-model="failureReason" maxlength="300" aria-label="模拟启动失败原因"/></label>
  <div class="simulation-actions"><button class="soft-button active" @click="run(()=>api.confirmStartSimulation(order.id,true))">模拟设备启动成功</button><button class="outline-button" @click="run(()=>api.confirmStartSimulation(order.id,false,failureReason))">模拟设备启动失败</button></div>
 </div>
 <div v-if="order.status==='charging'" class="simulation-actions"><button class="outline-button" @click="run(()=>api.advanceSimulation(order.id,10))">模拟推进 10 分钟</button><button class="soft-button active" @click="run(()=>api.endSimulation(order.id))">模拟结束充电</button></div>
 <form v-if="order.status==='abnormal'" class="exception-form" @submit.prevent="run(()=>api.resolveOrder(order.id,reason,verified))">
  <h3>异常核验</h3><p>设备恢复在线不会自动释放该任务；请核验停止状态后再处理。</p>
  <label><textarea v-model="reason" required rows="3" maxlength="500" placeholder="填写异常处理原因" aria-label="异常处理原因"/></label>
  <label class="checkbox-label"><input type="checkbox" v-model="verified"/> 已核验模拟设备停止，同意结束该任务并释放占用</label><button class="soft-button active" type="submit">保存核验结果</button>
 </form>
 <div v-if="order.status==='ended'&&order.payStatus==='unpaid'" class="simulation-actions"><span class="form-hint">用于演示普通用户的结束后付款结果</span><button class="soft-button active" @click="run(()=>api.paySimulation(order.id))">模拟用户支付</button></div>
 <section class="order-event-history"><h3>订单操作记录</h3><ol v-if="order.events?.length"><li v-for="(event,i) in order.events" :key="i"><time>{{event.at}}</time><span>{{event.description}}</span><small>{{event.source}}</small></li></ol><p v-else class="form-hint">历史演示订单未记录操作明细，不补造日志。</p></section>
</div><p v-else class="form-hint">订单不存在，请关闭后重新查询。</p>
</template>
