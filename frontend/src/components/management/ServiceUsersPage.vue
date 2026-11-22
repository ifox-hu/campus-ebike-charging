<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { decimal, displayTime } from '../../domain/management.js';

const props = defineProps({ client: Object });
defineEmits(['order']);
const keyword = ref('');
const result = ref({ rows: [], total: 0, page: 1, totalPages: 1 });
const detail = ref(null);
const busy = ref(false);
const detailBusy = ref(false);
const error = ref('');
let revision = 0;
let detailRevision = 0;
async function load(page = 1) {
  const request = ++revision;
  detailRevision++;
  detail.value = null;
  detailBusy.value = false;
  busy.value = true;
  error.value = '';
  try {
    const data = await props.client.serviceUsers({ page, keyword: keyword.value.trim() });
    if (request === revision) result.value = data;
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
async function show(user) {
  const request = ++detailRevision;
  detailBusy.value = true;
  detail.value = null;
  error.value = '';
  try {
    const data = await props.client.serviceUser(user.id);
    if (request === detailRevision) detail.value = data;
  } catch (failure) {
    if (request === detailRevision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === detailRevision) detailBusy.value = false;
  }
}
function closeDetail() { detailRevision++; detail.value = null; detailBusy.value = false; }
onMounted(() => load());
onBeforeUnmount(() => { revision++; detailRevision++; });
</script>

<template>
  <section class="management-page">
    <header class="management-heading"><div><h1>服务用户</h1><p>查看使用过本方站点的用户及其充电、报修记录。</p></div></header>
    <form class="mg-filters" @submit.prevent="load(1)"><label>用户搜索<input v-model="keyword" placeholder="账号或名称" maxlength="50" /></label><button class="soft-button active" :disabled="busy">查询</button></form>
    <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
    <div class="mg-table-wrap" :aria-busy="busy"><table class="management-table"><thead><tr><th>账号</th><th>用户名称</th><th>充电次数</th><th>最近充电</th><th>操作</th></tr></thead><tbody>
      <tr v-for="row in result.rows" :key="row.id"><td>{{ row.username }}</td><td>{{ row.displayName || '—' }}</td><td>{{ row.orderCount }}</td><td>{{ displayTime(row.lastUsedAt) }}</td><td><button class="table-link" :disabled="busy" @click="show(row)">查看记录</button></td></tr>
      <tr v-if="!result.rows.length"><td colspan="5" class="empty-table">{{ busy ? '正在读取用户…' : '暂无符合条件的服务用户' }}</td></tr>
    </tbody></table></div>
    <footer class="mg-pagination"><span>共 {{ result.total }} 位用户</span><button :disabled="busy || result.page <= 1" @click="load(result.page - 1)">上一页</button><span>{{ result.page }} / {{ result.totalPages }}</span><button :disabled="busy || result.page >= result.totalPages" @click="load(result.page + 1)">下一页</button></footer>
    <div v-if="detail || detailBusy" class="modal-shade" @click.self="closeDetail"><section class="modal-card mg-dialog" role="dialog" aria-modal="true" aria-label="服务用户记录"><header><h2>{{ detail?.user?.displayName || detail?.user?.username || '服务用户记录' }}</h2><button aria-label="关闭服务用户记录" @click="closeDetail">关闭</button></header>
      <p v-if="detailBusy" class="mg-notice">正在读取记录…</p>
      <template v-if="detail"><div class="mg-dialog-content"><h3>本方充电订单</h3><div class="mg-table-wrap"><table class="management-table"><thead><tr><th>订单号</th><th>开始时间</th><th>金额（元）</th><th>操作</th></tr></thead><tbody><tr v-for="order in detail.orders" :key="order.id"><td>{{ order.orderNo || order.id }}</td><td>{{ displayTime(order.startTime) }}</td><td>{{ decimal(order.totalAmount ?? order.total) }}</td><td><button class="table-link" @click="$emit('order', order.id); closeDetail()">订单详情</button></td></tr><tr v-if="!detail.orders.length"><td colspan="4">暂无充电订单</td></tr></tbody></table></div>
        <h3>本方报修记录</h3><div class="mg-table-wrap"><table class="management-table"><thead><tr><th>提交时间</th><th>问题描述</th><th>状态</th></tr></thead><tbody><tr v-for="repair in detail.repairs" :key="repair.id"><td>{{ displayTime(repair.createdAt) }}</td><td>{{ repair.description || repair.content }}</td><td>{{ ({ OPEN: '待处理', PROCESSING: '处理中', RESOLVED: '已完成' })[repair.status] || repair.status }}</td></tr><tr v-if="!detail.repairs.length"><td colspan="3">暂无报修记录</td></tr></tbody></table></div>
      </div></template>
    </section></div>
  </section>
</template>
