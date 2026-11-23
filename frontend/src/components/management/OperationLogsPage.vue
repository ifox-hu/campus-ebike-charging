<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { displayTime } from '../../domain/management.js';
const props = defineProps({ client: Object, operatorId: { default: '' }, operators: Array });
const username = ref('');
const method = ref('');
const from = ref('');
const to = ref('');
const result = ref({ rows: [], total: 0, page: 1, totalPages: 1 });
const error = ref('');
const busy = ref(false);
const detail = ref(null);
let revision = 0;
async function load(page = 1) {
  const request = ++revision;
  busy.value = true;
  error.value = '';
  detail.value = null;
  try {
    const data = await props.client.audit(page, {
      operatorId: props.operatorId,
      username: username.value.trim(),
      method: method.value,
      from: from.value,
      to: to.value,
    });
    if (request === revision) result.value = data;
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
const operatorName = (id) =>
  (props.operators || []).find((row) => String(row.id) === String(id))?.name || '平台';
function readable(value) {
  if (value == null || value === '') return '—';
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return String(value);
  }
}
watch(
  () => props.operatorId,
  () => load(),
  { immediate: true },
);
onBeforeUnmount(() => {
  revision++;
});
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <h1>操作日志</h1>
        <p>查询业务配置和账号操作，查看修改前后的记录。</p>
      </div>
    </header>
    <form class="mg-filters" @submit.prevent="load(1)">
      <label>操作人<input v-model="username" placeholder="登录账号" maxlength="50" /></label
      ><label
        >操作类型<select v-model="method">
          <option value="">全部操作</option>
          <option value="POST">新增 / 执行</option>
          <option value="PUT">修改配置</option>
          <option value="PATCH">变更状态</option>
          <option value="DELETE">删除</option>
        </select></label
      ><label>开始日期<input v-model="from" type="date" /></label
      ><label>结束日期<input v-model="to" type="date" /></label
      ><button class="soft-button active" :disabled="busy">查询</button>
    </form>
    <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
    <div class="mg-table-wrap">
      <table class="management-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>操作人</th>
            <th>运营商</th>
            <th>操作</th>
            <th>业务对象</th>
            <th>结果</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.rows" :key="row.id">
            <td>{{ displayTime(row.createdAt) }}</td>
            <td>{{ row.username }}</td>
            <td>{{ row.operatorName || operatorName(row.operatorId) }}</td>
            <td>{{ row.action || row.method }}</td>
            <td>{{ row.objectName || row.path }}</td>
            <td>{{ row.statusCode >= 200 && row.statusCode < 300 ? '成功' : '未完成' }}</td>
            <td><button class="table-link" @click="detail = row">查看变更</button></td>
          </tr>
          <tr v-if="!result.rows.length">
            <td colspan="7" class="empty-table">
              {{ busy ? '正在查询日志…' : '暂无符合条件的操作日志' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="mg-pagination">
      <span>共 {{ result.total }} 条</span
      ><button :disabled="busy || result.page <= 1" @click="load(result.page - 1)">上一页</button
      ><span>{{ result.page }} / {{ result.totalPages }}</span
      ><button :disabled="busy || result.page >= result.totalPages" @click="load(result.page + 1)">
        下一页
      </button>
    </footer>
    <div v-if="detail" class="modal-shade" @click.self="detail = null">
      <section
        class="modal-card mg-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="操作变更详情"
      >
        <header>
          <h2>操作变更详情</h2>
          <button aria-label="关闭操作详情" @click="detail = null">关闭</button>
        </header>
        <div class="mg-dialog-content">
          <p>{{ detail.username }} · {{ displayTime(detail.createdAt) }}</p>
          <p>{{ detail.method }} {{ detail.path }}</p>
          <div class="mg-change-grid">
            <section>
              <h3>修改前</h3>
              <pre>{{ readable(detail.beforeValue) }}</pre>
            </section>
            <section>
              <h3>修改后</h3>
              <pre>{{ readable(detail.afterValue) }}</pre>
            </section>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
