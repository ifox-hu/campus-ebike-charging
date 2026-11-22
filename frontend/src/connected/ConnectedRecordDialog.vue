<script setup>
import { computed } from 'vue';
import UiIcon from '../components/UiIcon.vue';
import StatusTag from '../components/StatusTag.vue';
import SocketQr from '../components/SocketQr.vue';
import { formatNumber, orderPresentation, statusLabel } from './platformClient.js';
const props = defineProps({
  dialog: { type: Object, required: true },
  selectedSockets: Array,
  stationName: Function,
  socketName: Function,
  canWrite: Boolean,
  actionBusy: Boolean,
  socketBusy: Boolean,
  audit: Object,
  auditError: String,
  auditBusy: Boolean,
  error: String,
});
defineEmits(['close', 'navigate', 'edit-socket', 'change-socket', 'toggle-user', 'load-audit']);
const orderDetails = computed(() =>
  props.dialog.type === 'order' ? orderPresentation(props.dialog.record) : null,
);
</script>
<template>
  <div class="modal-shade" @click.self="!actionBusy && $emit('close')">
    <section class="modal-card" role="dialog" aria-modal="true" aria-label="服务端记录详情">
      <header>
        <h2>
          {{
            dialog.type === 'station'
              ? '站点关联业务'
              : dialog.type === 'audit'
                ? '服务端操作日志'
                : dialog.type === 'user'
                  ? '确认用户状态'
                  : dialog.type === 'device'
                    ? '设备与插座'
                    : '服务端订单详情'
          }}
        </h2>
        <button
          class="icon-button"
          aria-label="关闭弹窗"
          :disabled="actionBusy"
          @click="$emit('close')"
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div class="remote-detail">
        <template v-if="dialog.type === 'station'"
          ><h3>{{ dialog.record.name }}</h3>
          <p>{{ dialog.record.address }}</p>
          <p>营业时间 {{ dialog.record.businessHours || '未填写' }} · 联系电话 {{ dialog.record.contactPhone || '未填写' }}</p>
          <p>{{ dialog.record.deviceCount }} 台设备 · {{ dialog.record.socketCount }} 个插座</p>
          <div class="station-business-links">
            <button
              v-for="target in [
                { page: 'devices', label: '设备与插座' },
                { page: 'orders', label: '关联订单' },
                { page: 'reports', label: '报修记录' },
                { page: 'rates', label: '分时电价' },
              ]"
              :key="target.page"
              class="outline-button"
              @click="$emit('navigate', { page: target.page, stationId: dialog.record.id })"
            >
              {{ target.label }}
            </button>
          </div></template
        ><template v-if="dialog.type === 'loading'"><p>正在读取订单详情…</p></template>
        <template v-if="dialog.type === 'device'"
          ><h3>{{ dialog.record.code }}</h3>
          <p>
            {{ dialog.record.rowName || '未提供排号' }} · 服务端共
            {{ selectedSockets.length }} 个插座。
          </p>
          <div class="socket-grid">
            <article v-for="socket in selectedSockets" :key="socket.id" class="socket-card">
              <strong>{{ socket.name || socket.code }}</strong>
              <p>{{ socket.code }}</p>
              <StatusTag :text="statusLabel(socket.status, 'socket')" />
              <p>配置功率：{{ socket.powerWatts == null ? '未提供' : socket.powerWatts + ' W' }}</p>
              <div v-if="canWrite" class="socket-actions">
                <button
                  class="table-link"
                  :disabled="socketBusy || socket.status !== 'IDLE'"
                  @click="$emit('edit-socket', socket)"
                >
                  修改配置功率</button
                ><button
                  v-for="[value, label] in [
                    ['IDLE', '核验恢复'],
                    ['FAULT', '设为故障'],
                    ['DISABLED', '停用'],
                  ]"
                  :key="value"
                  class="table-link"
                  :disabled="socketBusy || socket.status === 'CHARGING' || socket.status === value"
                  @click="$emit('change-socket', socket, value)"
                >
                  {{ label }}
                </button>
              </div>
              <SocketQr :code="socket.code" />
            </article></div
        ></template>
        <template v-if="dialog.type === 'order'"
          ><div class="order-state-line">
            <StatusTag :text="statusLabel(dialog.record.status, 'order')" /><StatusTag
              :text="statusLabel(dialog.record.paymentStatus, 'payment')"
            />
          </div>
          <dl class="detail-grid">
            <dt>订单编号</dt>
            <dd>{{ dialog.record.orderNo }}</dd>
            <dt>用户</dt>
            <dd>{{ dialog.record.ownerUsername || '未提供' }}</dd>
            <dt>站点</dt>
            <dd>{{ dialog.record.stationNameSnapshot || stationName(dialog.record.stationId) }}</dd>
            <dt>插座</dt>
            <dd>{{ dialog.record.socketCodeSnapshot || socketName(dialog.record.connectorId) }}</dd>
            <dt>充电方案</dt>
            <dd>{{ orderDetails.plan }}</dd>
            <dt>计量来源</dt>
            <dd>{{ orderDetails.meter }}</dd>
            <dt>配置功率</dt>
            <dd>{{ dialog.record.powerWatts ?? '—' }} W</dd>
            <dt>预计结束</dt>
            <dd>{{ dialog.record.scheduledEndTime || '历史订单未记录' }}</dd>
            <dt>结束原因</dt>
            <dd>{{ orderDetails.reason }}</dd>
            <dt>开始时间</dt>
            <dd>{{ dialog.record.startTime || '未提供' }}</dd>
            <dt>结束时间</dt>
            <dd>{{ dialog.record.endTime || '未提供' }}</dd>
            <dt>电量</dt>
            <dd>{{ formatNumber(dialog.record.energyKwh, 3) }} kWh</dd>
            <dt>电费</dt>
            <dd>{{ formatNumber(dialog.record.electricityFee) }} 元</dd>
            <template v-if="Number(dialog.record.serviceFee) > 0"
              ><dt>服务费</dt>
              <dd>{{ formatNumber(dialog.record.serviceFee) }} 元</dd></template
            >
            <dt>合计</dt>
            <dd>{{ formatNumber(dialog.record.totalAmount) }} 元</dd>
          </dl>
          <p class="form-hint">
            配置功率为启动时保存的插座参数；定时任务由业务后端执行。全部取自服务端账单。历史账单以服务端结果为准，不使用当前站点费率重新计算。
          </p></template
        >
        <template v-if="dialog.type === 'user'"
          ><p>
            确认{{ dialog.record.enabled ? '停用' : '启用' }}普通用户 {{ dialog.record.username }}？
          </p>
          <p>将调用服务端账号状态接口，结果以服务端校验为准。</p>
          <p v-if="error" class="remote-error" role="alert">{{ error }}</p>
          <button class="soft-button active" :disabled="actionBusy" @click="$emit('toggle-user')">
            {{ actionBusy ? '正在更新…' : '确认更新状态' }}
          </button></template
        >
        <template v-if="dialog.type === 'audit'"
          ><p>以下来自业务后端审计表，不是浏览器模拟日志。</p>
          <p v-if="auditError" class="remote-error" role="alert">{{ auditError }}</p>
          <div class="management-table-wrap">
            <table class="management-table">
              <thead>
                <tr>
                  <th>账号</th>
                  <th>请求</th>
                  <th>状态码</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in audit.rows" :key="item.id">
                  <td>{{ item.username }}</td>
                  <td>{{ item.method }} {{ item.path }}</td>
                  <td>{{ item.statusCode }}</td>
                  <td>{{ item.createdAt }}</td>
                </tr>
                <tr v-if="!audit.rows.length">
                  <td colspan="4">{{ auditBusy ? '读取中…' : '暂无日志' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="remote-pagination">
            <button
              class="outline-button"
              :disabled="auditBusy || audit.page <= 1"
              @click="$emit('load-audit', audit.page - 1)"
            >
              上一页</button
            ><span>{{ audit.page }} / {{ Math.max(1, audit.totalPages) }}</span
            ><button
              class="outline-button"
              :disabled="auditBusy || audit.page >= audit.totalPages"
              @click="$emit('load-audit', audit.page + 1)"
            >
              下一页</button
            ><button
              class="text-button"
              :disabled="auditBusy"
              @click="$emit('load-audit', audit.page)"
            >
              刷新日志
            </button>
          </div></template
        >
      </div>
      <footer>
        <button class="outline-button" :disabled="actionBusy" @click="$emit('close')">关闭</button>
      </footer>
    </section>
  </div>
</template>
