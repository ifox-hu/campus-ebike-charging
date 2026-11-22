<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({ client: Object, operators: Array, stations: Array });
const emit = defineEmits(['updated']);
const name = ref('');
const selected = ref('');
const stationId = ref('');
const staff = ref([]);
const loadingStaff = ref(false);
const saving = ref(false);
const error = ref('');
const info = ref('');
const newStaff = () => ({ username: '', displayName: '', password: '', role: 'OPERATOR_ADMIN' });
const account = ref(newStaff());
let staffRequest = 0;

const ownedSites = computed(() => props.stations.filter(site => String(site.operatorId ?? 1) === selected.value));

async function loadStaff() {
  const request = ++staffRequest;
  staff.value = [];
  if (!selected.value) return;
  loadingStaff.value = true;
  try {
    const result = await props.client.operatorStaff(selected.value);
    if (request === staffRequest) staff.value = result;
  } catch (failure) {
    if (request === staffRequest && !failure.stale) error.value = failure.message;
  } finally {
    if (request === staffRequest) loadingStaff.value = false;
  }
}
watch(selected, () => { stationId.value = ''; error.value = ''; info.value = ''; loadStaff(); });
watch(() => props.operators, (items) => {
  if (!selected.value && items.length) selected.value = String(items[0].id);
}, { immediate: true });

async function submit(action) {
  if (saving.value) return;
  error.value = '';
  info.value = '';
  saving.value = true;
  try {
    await action();
  } catch (failure) {
    if (!failure.stale) error.value = failure.message;
  } finally {
    saving.value = false;
  }
}
function createOperator() {
  submit(async () => {
    const operator = await props.client.createOperator(name.value.trim());
    name.value = '';
    selected.value = String(operator.id);
    emit('updated');
    await loadStaff();
    info.value = '运营商已创建。';
  });
}
function assignStation() {
  submit(async () => {
    await props.client.assignStation(stationId.value, selected.value);
    stationId.value = '';
    emit('updated');
    info.value = '站点归属已保存。';
  });
}
function createAccount() {
  submit(async () => {
    await props.client.createOperatorStaff(selected.value, account.value);
    account.value = newStaff();
    await loadStaff();
    info.value = '运营账号已创建。';
  });
}
function toggle(row) {
  submit(async () => {
    await props.client.setUserEnabled(row.id, !row.enabled);
    await loadStaff();
    info.value = row.enabled ? '账号已停用。' : '账号已启用。';
  });
}
const roleName = role => role === 'OPERATOR_ADMIN' ? '运营商管理员' : '运营员';
</script>

<template>
  <section class="management-page">
    <header class="management-heading"><div><h1>运营商管理</h1><p>管理合作运营商、站点归属和后台账号。</p></div></header>
    <p v-if="error" class="remote-error" role="alert">{{ error }}</p>
    <p v-if="info" class="remote-message" role="status">{{ info }}</p>
    <form class="filter-bar" @submit.prevent="createOperator">
      <label>运营商名称 <input v-model="name" required maxlength="80" /></label>
      <button class="soft-button active" :disabled="saving">新增运营商</button>
    </form>
    <fieldset class="operator-forms" :disabled="saving">
      <label>当前运营商
        <select v-model="selected"><option v-for="item in operators" :key="item.id" :value="String(item.id)">{{ item.name }}</option></select>
      </label>
      <p>{{ ownedSites.length }} 个站点<span v-for="site in ownedSites" :key="site.id"> · {{ site.name }}</span></p>
      <form class="filter-bar" @submit.prevent="assignStation">
        <label>分配站点
          <select v-model="stationId" required>
            <option value="">请选择站点</option>
            <option v-for="site in stations" :key="site.id" :value="site.id" :disabled="String(site.operatorId ?? 1) === selected">{{ site.name }}</option>
          </select>
        </label>
        <button class="outline-button" :disabled="!selected">保存站点归属</button>
      </form>
      <form class="filter-bar" @submit.prevent="createAccount">
        <label>登录账号 <input v-model="account.username" required pattern="[A-Za-z0-9_]{3,30}" autocomplete="off" /></label>
        <label>显示名称 <input v-model="account.displayName" required maxlength="50" /></label>
        <label>初始密码 <input v-model="account.password" required type="password" minlength="8" maxlength="72" autocomplete="new-password" /></label>
        <label>角色 <select v-model="account.role"><option value="OPERATOR_ADMIN">运营商管理员</option><option value="OPERATOR">运营员</option></select></label>
        <button class="soft-button active" :disabled="!selected">新增运营账号</button>
      </form>
    </fieldset>
    <div class="management-table-wrap">
      <table class="management-table">
        <thead><tr><th>账号</th><th>显示名称</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in staff" :key="row.id">
            <td>{{ row.username }}</td><td>{{ row.displayName }}</td><td>{{ roleName(row.role) }}</td>
            <td>{{ row.enabled ? '启用' : '停用' }}</td>
            <td><button class="table-link" :disabled="saving" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</button></td>
          </tr>
          <tr v-if="!staff.length"><td colspan="5" class="empty-table">{{ loadingStaff ? '正在读取账号…' : '暂无运营账号' }}</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.operator-forms { border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: inline-flex; gap: .5rem; align-items: center; }
.filter-bar { flex-wrap: wrap; }
</style>
