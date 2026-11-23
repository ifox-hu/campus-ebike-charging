<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { eligibleAssignees, repairAge } from '../domain/repairWorkflow.js';
import { statusLabel } from './platformClient.js';
const props = defineProps({
  client: Object,
  enabled: Boolean,
  admin: Boolean,
  stationIds: Array,
  operatorId: [String, Number],
  scope: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['clear-scope']);
const rows = ref([]),
  filter = ref(props.scope.repairStatus || ''),
  busy = ref(false),
  saving = ref(false),
  error = ref(''),
  message = ref(''),
  selected = ref(null),
  nextStatus = ref('PROCESSING'),
  resolution = ref('');
const assignees = ref([]),
  assigneesBusy = ref(false),
  assigneesError = ref(''),
  overdueOnly = ref(false),
  now = ref(Date.now());
let assigneeRevision = 0,
  ageTimer;
const currentAssigneeMissing = computed(
  () => assignee.value && !assignees.value.some((account) => account.username === assignee.value),
);
const assignee = ref('');
function history(row) {
  try {
    return JSON.parse(row.progressHistory || '[]');
  } catch {
    return [];
  }
}
const visible = computed(() =>
  rows.value.filter(
    (r) =>
      (!props.operatorId ||
        (r.operatorId != null
          ? String(r.operatorId) === String(props.operatorId)
          : !props.stationIds || props.stationIds.includes(r.stationId))) &&
      (!props.scope.stationId || String(r.stationId) === String(props.scope.stationId)) &&
      (!overdueOnly.value || repairAge(r, now.value).overdue),
  ),
);
let active = true;
async function reload() {
  if (!props.enabled || busy.value || saving.value) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await props.client.repairs(filter.value);
    if (active) {
      rows.value = result;
      if (props.scope.repairId) {
        const target = result.find((r) => String(r.id) === String(props.scope.repairId));
        if (target) open(target);
        else error.value = '该报修不存在或当前账号无权查看。';
      }
    }
  } catch (e) {
    if (active && !e.stale) error.value = e.message;
  } finally {
    if (active) busy.value = false;
  }
}
async function loadAssignees(row) {
  const revision = ++assigneeRevision;
  assignees.value = [];
  assigneesError.value = '';
  assigneesBusy.value = false;
  if (!props.admin || row.status === 'RESOLVED') return;
  assigneesBusy.value = true;
  try {
    const result = await props.client.repairAssignees(row.id);
    if (active && revision === assigneeRevision)
      assignees.value = eligibleAssignees(result, row.operatorId);
  } catch (failure) {
    if (active && revision === assigneeRevision && !failure.stale)
      assigneesError.value = '处理人员读取失败：' + failure.message;
  } finally {
    if (active && revision === assigneeRevision) assigneesBusy.value = false;
  }
}
function close() {
  assigneeRevision++;
  selected.value = null;
  assigneesBusy.value = false;
}
function open(row) {
  loadAssignees(row);
  assignee.value = row.assigneeUsername || '';
  selected.value = row;
  nextStatus.value = row.status === 'OPEN' ? 'PROCESSING' : 'RESOLVED';
  resolution.value = row.resolution || '';
  error.value = '';
  message.value = '';
}
async function save() {
  if (saving.value || !selected.value || assigneesBusy.value) return;
  if (nextStatus.value === 'RESOLVED' && resolution.value.trim().length < 2) {
    error.value = '请填写处理结果';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await props.client.handleRepair(selected.value.id, {
      status: nextStatus.value,
      resolution: resolution.value.trim(),
      ...(props.admin && assignee.value.trim() ? { assigneeUsername: assignee.value.trim() } : {}),
    });
    if (!active) return;
    close();
    message.value = '处理结果已保存，用户刷新报修记录即可查看';
  } catch (e) {
    if (active && !e.stale) error.value = e.message;
  } finally {
    if (active) saving.value = false;
  }
  if (active && !error.value) await reload();
}
watch(
  () => props.operatorId,
  () => {
    close();
    message.value = '';
  },
);
watch(
  () => props.scope,
  () => {
    filter.value = props.scope.repairStatus || '';
    reload();
  },
);
onMounted(() => {
  reload();
  ageTimer = setInterval(() => (now.value = Date.now()), 60000);
});
onBeforeUnmount(() => {
  active = false;
  assigneeRevision++;
  clearInterval(ageTimer);
});
defineExpose({ reload });
</script>
<template>
  <section class="management-page repair-management">
    <header class="management-heading">
      <div>
        <h1>故障报修</h1>
        <p>查看用户反馈，记录处理进展与结果。处理报修不会自动更改插座状态。</p>
      </div>
    </header>
    <p v-if="!enabled" class="remote-error">当前后端版本尚未提供在线报修，请更新后端后重试。</p>
    <template v-else>
      <div class="filter-bar">
        <select
          v-model="filter"
          aria-label="报修状态筛选"
          :disabled="busy || saving"
          @change="reload"
        >
          <option value="">全部报修</option>
          <option value="OPEN">待处理</option>
          <option value="PROCESSING">处理中</option>
          <option value="RESOLVED">已处理</option></select
        ><label class="overdue-filter"
          ><input v-model="overdueOnly" type="checkbox" />仅看超过24小时未完成</label
        ><button class="outline-button" :disabled="busy || saving" @click="reload">刷新报修</button>
      </div>
      <p v-if="scope.stationId || scope.repairId" class="remote-message">
        按关联站点或报修记录查看
        <button class="text-button" @click="emit('clear-scope')">清除关联筛选</button>
      </p>
      <p v-if="error" class="remote-error" role="alert">{{ error }}</p>
      <p v-if="message" class="remote-message" role="status">{{ message }}</p>
      <div class="management-table-wrap">
        <table class="management-table repair-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>用户</th>
              <th>站点 / 设备</th>
              <th>问题说明</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visible" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row.ownerUsername }}</td>
              <td>{{ row.stationName }}<br />{{ row.socketCode || row.deviceCode }}</td>
              <td class="repair-description">{{ row.description }}</td>
              <td>
                {{ statusLabel(row.status, 'repair')
                }}<small
                  class="repair-age"
                  :class="{ 'repair-overdue': repairAge(row, now).overdue }"
                  >{{ repairAge(row, now).label }}</small
                ><small class="repair-age">负责人：{{ row.assigneeUsername || '未分派' }}</small>
              </td>
              <td>{{ row.createdAt?.replace('T', ' ').slice(0, 19) }}</td>
              <td>
                <button class="table-link repair-open" @click="open(row)">
                  {{ row.status === 'RESOLVED' ? '查看结果' : '处理' }}
                </button>
              </td>
            </tr>
            <tr v-if="!visible.length">
              <td colspan="7" class="empty-table">{{ busy ? '正在读取报修…' : '暂无报修记录' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-if="selected" class="modal-shade">
      <section
        class="modal-card repair-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="报修处理"
      >
        <header>
          <h2>报修 #{{ selected.id }}</h2>
          <button class="icon-button" :disabled="saving" aria-label="关闭报修" @click="close">
            ×
          </button>
        </header>
        <div class="remote-detail">
          <p>{{ selected.stationName }} · {{ selected.socketCode || selected.deviceCode }}</p>
          <p class="repair-description">{{ selected.description }}</p>
          <p>负责人：{{ selected.assigneeUsername || '尚未分派' }}</p>
          <ol class="repair-timeline">
            <li>用户提交 · {{ selected.createdAt }}</li>
            <li v-for="(event, i) in history(selected)" :key="i">
              {{ event.at }} · {{ event.status === 'RESOLVED' ? '已处理' : '处理中' }} ·
              {{ event.note || '已受理' }}
            </li>
          </ol>
          <template v-if="selected.status !== 'RESOLVED'"
            ><label v-if="admin" class="repair-field"
              >处理人员<select
                v-model="assignee"
                aria-label="报修处理人员"
                :disabled="saving || assigneesBusy"
              >
                <option value="">由当前处理人负责</option>
                <option v-if="currentAssigneeMissing" :value="assignee" disabled>
                  {{ assignee }}（原负责人）
                </option>
                <option
                  v-for="account in assignees"
                  :key="account.username"
                  :value="account.username"
                >
                  {{ account.displayName || account.username }} · {{ account.username }}
                </option>
              </select></label
            >
            <p v-if="assigneesBusy" class="remote-message">正在读取处理人员…</p>
            <p v-if="assigneesError" class="remote-error" role="alert">
              {{ assigneesError }}
              <button class="text-button" @click="loadAssignees(selected)">重试</button>
            </p>
            <label class="repair-field"
              >处理状态<select v-model="nextStatus" :disabled="saving">
                <option value="PROCESSING">处理中</option>
                <option value="RESOLVED">已处理</option>
              </select></label
            ><label class="repair-field"
              >处理反馈<textarea
                v-model="resolution"
                maxlength="500"
                :disabled="saving"
                placeholder="记录进展；完成时填写处理结果"
              />
            </label>
            <p v-if="error" class="remote-error" role="alert">{{ error }}</p>
            <button
              class="soft-button active repair-save"
              :disabled="saving || assigneesBusy"
              @click="save"
            >
              {{ saving ? '正在保存…' : '保存处理结果' }}
            </button></template
          >
          <template v-else
            ><p>处理人：{{ selected.handlerUsername }}</p>
            <p class="repair-description">{{ selected.resolution }}</p>
            <p>{{ selected.updatedAt?.replace('T', ' ').slice(0, 19) }}</p></template
          >
        </div>
      </section>
    </div>
  </section>
</template>
<style scoped>
.repair-age {
  display: block;
  margin-top: 5px;
  color: #938a9f;
  font-size: 12px;
  white-space: nowrap;
}
.repair-age.repair-overdue {
  color: #bc7030;
}
.overdue-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #736a82;
}

.repair-timeline {
  padding-left: 1.2rem;
  font-size: 0.85rem;
  line-height: 1.9;
}
.repair-field input {
  border: 1px solid #e3dcea;
  border-radius: 6px;
  padding: 10px;
  color: inherit;
}
.repair-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-width: 28rem;
  line-height: 1.7;
}
.repair-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 1rem 0;
}
.repair-field select,
.repair-field textarea {
  border: 1px solid #e3dcea;
  border-radius: 0.4rem;
  padding: 0.7rem;
  font: inherit;
  color: inherit;
  background: #fff;
}
.repair-field textarea {
  height: 9rem;
  resize: vertical;
}
.repair-dialog {
  max-height: 85vh;
  overflow: auto;
}
.repair-table {
  min-width: 850px;
}
</style>
