<script setup>
import brandMark from '../assets/brand-mark.svg';
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import UiIcon from '../components/UiIcon.vue';
import EnergyLogin from '../components/EnergyLogin.vue';
import RepairsPanel from './RepairsPanel.vue';
import { managementNavigation, managementPages } from '../domain/management.js';
import ManagementWorkspace from '../components/management/ManagementWorkspace.vue';
import ConnectedDashboardPage from './pages/ConnectedDashboardPage.vue';
import { createPlatformClient, filterOperatorData } from './platformClient.js';
import ConnectedRecordDialog from './ConnectedRecordDialog.vue';
import ConnectedCatalogPage from './pages/ConnectedCatalogPage.vue';
import ConnectedOrdersPage from './pages/ConnectedOrdersPage.vue';
import ConnectedRatesPage from './pages/ConnectedRatesPage.vue';
import ConnectedUsersPage from './pages/ConnectedUsersPage.vue';
import './connected.css';
import ConnectedEditor from './ConnectedEditor.vue';
import OperationsPanel from '../components/OperationsPanel.vue';
import { currentAbnormalDeviceIds, mapConnectedSource } from '../domain/operations.js';
const user = ref(null);
const username = ref('');
const password = ref('');
const loginError = ref('');
const loginBusy = ref(false);
const page = ref('dashboard');
const collapsed = ref(false);
const error = ref('');
const busy = ref(false);
const loadedAt = ref('');
const navigationVersion = ref(0);
const dialog = ref(null);
const actionBusy = ref(false);
const message = ref('');
const data = reactive({
  stations: [],
  devices: [],
  sockets: [],
  orders: [],
  reports: [],
  reportsLoaded: false,
});
const users = ref({ rows: [], total: 0, page: 1, totalPages: 1 });
const usersBusy = ref(false);
const rates = ref([]);
const rateStation = ref('');
const ratesBusy = ref(false);
const ratesError = ref('');
const audit = ref({ rows: [], page: 1, totalPages: 1 });
const auditBusy = ref(false);
const auditError = ref('');
const repairsPanel = ref(null);
const editor = ref(null);
const socketBusy = ref(false);
const scope = ref({});
const energyLogin = ref(null);
const platformAdmin = computed(() => user.value?.role === 'ADMIN');
const canWrite = computed(() => platformAdmin.value || user.value?.role === 'OPERATOR_ADMIN');
const operators = ref([]);
const operatorFilter = ref('');
const operatorNames = computed(() => Object.fromEntries(operators.value.map(item => [item.id, item.name])));
const menus = computed(() => managementNavigation(user.value?.role));
const visibleData = computed(() => filterOperatorData(data, operatorFilter.value));
const source = computed(() => mapConnectedSource(visibleData.value));
const visibleStationIds = computed(() => operatorFilter.value ? visibleData.value.stations.map(site => site.id) : null);
function changeOperatorFilter() {
  scope.value = {};
  dialog.value = null;
  editor.value = null;
  navigationVersion.value++;
  if (page.value === 'rates') {
    rateStation.value = String(visibleData.value.stations[0]?.id || '');
    loadRates();
  }
}
async function saved() {
  editor.value = null;
  message.value = '服务端数据已保存。';
  await refresh();
  if (page.value === 'rates') await loadRates();
}
async function changeSocket(socket, status) {
  if (!canWrite.value || socketBusy.value) return;
  socketBusy.value = true;
  error.value = '';
  try {
    await client.setSocketStatus(socket.id, status);
    dialog.value = null;
    socketBusy.value = false;
    await refresh();
  } catch (e) {
    if (!e.stale) error.value = e.message + '；请刷新核对结果。';
  } finally {
    socketBusy.value = false;
  }
}
async function removeRate(row) {
  if (
    !canWrite.value ||
    actionBusy.value ||
    !window.confirm('确认删除此费率时段？未覆盖全天时用户将不能启动新订单。')
  )
    return;
  actionBusy.value = true;
  try {
    await client.deleteRate(row.id);
    await loadRates();
  } catch (e) {
    if (!e.stale) ratesError.value = e.message;
  } finally {
    actionBusy.value = false;
  }
}
function openDevice(id) {
  const record = data.devices.find((d) => String(d.id) === String(id));
  if (record) dialog.value = { type: 'device', record };
  else error.value = '设备记录已变化，请刷新后重试。';
}
function openOrder(id) {
  const record = data.orders.find((o) => String(o.id) === String(id));
  if (record) showOrder(record);
  else showOrder({ id });
}
let sessionRevision = 0;
let ratesRequestRevision = 0;
let timer;
const client = createPlatformClient({
  onExpired: () => logout('登录已过期，请重新登录业务后端。'),
});
function clear() {
  sessionRevision++;
  ratesRequestRevision++;
  Object.assign(data, {
    stations: [],
    devices: [],
    sockets: [],
    orders: [],
    reports: [],
    reportsLoaded: false,
  });
  scope.value = {};
  operators.value = [];
  operatorFilter.value = '';
  users.value = { rows: [], total: 0, page: 1, totalPages: 1 };
  rates.value = [];
  audit.value = { rows: [], page: 1, totalPages: 1 };
  rateStation.value = '';
  dialog.value = null;
  loadedAt.value = '';
  error.value = '';
  message.value = '';
  editor.value = null;
  busy.value = false;
  usersBusy.value = false;
  ratesBusy.value = false;
  auditBusy.value = false;
  actionBusy.value = false;
  ratesError.value = '';
  auditError.value = '';
}
function logout(text = '已退出本页面的业务后端会话。') {
  client.logout();
  user.value = null;
  clear();
  loginError.value = text;
  clearInterval(timer);
}
async function login() {
  if (loginBusy.value) return;
  loginBusy.value = true;
  loginError.value = '';
  try {
    clear();
    const session = sessionRevision;
    const profile = await client.login(username.value.trim(), password.value);
    password.value = '';
    await energyLogin.value?.complete();
    if (session !== sessionRevision) return;
    user.value = profile;
    page.value = 'dashboard';
    await refresh();
    timer = setInterval(() => {
      if (
        !document.hidden &&
        !busy.value &&
        !actionBusy.value &&
        !dialog.value &&
        !editor.value &&
        user.value
      )
        refresh();
    }, 5000);
  } catch (e) {
    if (!e.stale) loginError.value = e.message;
  } finally {
    password.value = '';
    loginBusy.value = false;
  }
}
function requirePage(value) {
  if (!value || !Array.isArray(value.rows) || !Number.isFinite(Number(value.total)))
    throw Error('后端分页格式不正确。');
  return value;
}
async function refresh() {
  if (!user.value || busy.value || usersBusy.value || actionBusy.value || socketBusy.value) return;
  const requestVersion = sessionRevision;
  busy.value = true;
  error.value = '';
  try {
    const [stations, devices, sockets, orders, userPage, operatorList] = await Promise.all([
      client.stations(),
      client.devices(),
      client.sockets(),
      client.orders(),
      platformAdmin.value ? client.users(users.value.page) : null,
      platformAdmin.value ? client.operators() : [],
    ]);
    if (requestVersion !== sessionRevision) return;
    Object.assign(data, { stations, devices, sockets, orders });
    if (userPage) users.value = requirePage(userPage);
    operators.value = operatorList;
    if (user.value.features?.repairs) {
      try {
        const reports = await client.repairs();
        if (requestVersion !== sessionRevision) return;
        data.reports = reports;
        data.reportsLoaded = true;
      } catch (e) {
        if (requestVersion !== sessionRevision) return;
        data.reportsLoaded = false;
        if (!e.stale) message.value = '报修待办未能读取，请在故障报修中重试。';
      }
    }
    loadedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (e) {
    if (requestVersion === sessionRevision && !e.stale)
      error.value =
        (loadedAt.value ? '刷新失败，以下为上次成功读取的数据。' : '未能读取服务端数据。') +
        e.message;
  } finally {
    if (requestVersion === sessionRevision) busy.value = false;
  }
}
async function loadUsers(target) {
  if (usersBusy.value || busy.value || actionBusy.value) return;
  const requestVersion = sessionRevision;
  usersBusy.value = true;
  error.value = '';
  try {
    const result = requirePage(await client.users(target));
    if (requestVersion === sessionRevision) users.value = result;
  } catch (e) {
    if (requestVersion === sessionRevision && !e.stale) error.value = e.message;
  } finally {
    if (requestVersion === sessionRevision) usersBusy.value = false;
  }
}
async function toggleUser() {
  if (actionBusy.value) return;
  const target = dialog.value?.record;
  if (!target) return;
  const requestVersion = sessionRevision;
  actionBusy.value = true;
  error.value = '';
  try {
    await client.setUserEnabled(target.id, !target.enabled);
    const result = requirePage(await client.users(users.value.page));
    if (requestVersion !== sessionRevision) return;
    users.value = result;
    message.value = '服务端账号状态已更新。';
    dialog.value = null;
  } catch (e) {
    if (requestVersion === sessionRevision && !e.stale)
      error.value = e.message + '；请刷新核对服务端结果。';
  } finally {
    if (requestVersion === sessionRevision) actionBusy.value = false;
  }
}
async function loadRates() {
  const requestVersion = ++ratesRequestRevision;
  const session = sessionRevision;
  if (!rateStation.value) {
    rates.value = [];
    return;
  }
  ratesBusy.value = true;
  ratesError.value = '';
  rates.value = [];
  try {
    const result = await client.rates(rateStation.value);
    if (requestVersion === ratesRequestRevision && session === sessionRevision)
      rates.value = result;
  } catch (e) {
    if (requestVersion === ratesRequestRevision && session === sessionRevision && !e.stale)
      ratesError.value = e.message;
  } finally {
    if (requestVersion === ratesRequestRevision && session === sessionRevision)
      ratesBusy.value = false;
  }
}
async function loadAudit(target = 1) {
  if (auditBusy.value) return;
  const requestVersion = sessionRevision;
  auditBusy.value = true;
  auditError.value = '';
  try {
    const result = requirePage(await client.audit(target));
    if (requestVersion === sessionRevision) audit.value = result;
  } catch (e) {
    if (requestVersion === sessionRevision && !e.stale) auditError.value = e.message;
  } finally {
    if (requestVersion === sessionRevision) auditBusy.value = false;
  }
}
async function showOrder(record) {
  const requestVersion = sessionRevision;
  const pending = { type: 'loading', requestKey: Symbol() };
  dialog.value = pending;
  try {
    const result = await client.order(record.id);
    if (requestVersion === sessionRevision && dialog.value?.requestKey === pending.requestKey) dialog.value = { type: 'order', record: result };
  } catch (e) {
    if (requestVersion === sessionRevision && dialog.value?.requestKey === pending.requestKey && !e.stale) {
      dialog.value = null;
      error.value = e.message;
    }
  }
}
function nav(value) {
  navigationVersion.value++;
  const target = typeof value === 'string' ? { page: value } : value;
  if (!target || !menus.value.some(item => item.id === target.page)) return;
  page.value = target.page;
  scope.value = { ...target };
  dialog.value = null;
  message.value = '';
  if (target.page === 'rates') {
    const available = visibleData.value.stations;
    const candidate = target.stationId || rateStation.value;
    rateStation.value = String(available.find(site => String(site.id) === String(candidate))?.id || available[0]?.id || '');
    loadRates();
  }
}
const title = computed(() => menus.value.find((n) => n.id === page.value)?.label || '运营概览');
const stationName = (id) => data.stations.find((s) => s.id === id)?.name || `站点 #${id}`;
const socketName = (id) => data.sockets.find((s) => s.id === id)?.code || `插座 #${id}`;
const scopedStationName = computed(() =>
  scope.value.stationId ? stationName(scope.value.stationId) : '',
);
const abnormalDeviceIds = computed(() => currentAbnormalDeviceIds(source.value));
const listLoading = computed(() => busy.value || ratesBusy.value || usersBusy.value);
const listError = computed(() => error.value || ratesError.value);
function editSocket(socket) {
  editor.value = { type: 'socket', record: socket };
  dialog.value = null;
}
const selectedSockets = computed(() =>
  dialog.value?.type === 'device'
    ? data.sockets.filter((s) => s.chargerId === dialog.value.record.id)
    : [],
);
onBeforeUnmount(() => {
  sessionRevision++;
  clearInterval(timer);
  client.logout();
});
</script>
<template>
  <EnergyLogin
    v-if="!user"
    ref="energyLogin"
    v-model:username="username"
    v-model:password="password"
    title="管理平台登录"
    subtitle="登录后管理站点、设备与独立插座"
    :allow-remember="false"
    :busy="loginBusy"
    :error="loginError"
    @submit="login"
    ><template #help>使用平台管理员、运营商管理员或运营员账号。</template></EnergyLogin
  >
  <div v-else class="platform connected-platform" :class="{ 'sidebar-collapsed': collapsed }">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="nav('dashboard')"
        ><img class="brand-logo" :src="brandMark" alt="" /><span class="brand-name"
          >电动自行车<br />智慧充电管理系统</span
        ></a
      >
      <nav class="navigation" aria-label="主导航">
        <div v-for="item in menus" :key="item.id" class="nav-group">
          <button class="nav-item" :class="{ active: page === item.id }" @click="nav(item.id)">
            <UiIcon :name="item.icon" /><span>{{ item.label }}</span>
          </button>
        </div>
      </nav>
    </aside>
    <header class="topbar">
      <button class="icon-button fold-button" aria-label="切换导航" @click="collapsed = !collapsed">
        <UiIcon name="menu" />
      </button>
      <div class="breadcrumbs">
        充电管理 / <strong>{{ title }}</strong>
      </div>
      <div class="topbar-tools connected-tools">
        <label v-if="platformAdmin" class="connected-operator-filter">运营商
          <select v-model="operatorFilter" @change="changeOperatorFilter">
            <option value="">全部运营商</option>
            <option v-for="item in operators" :key="item.id" :value="String(item.id)">{{ item.name }}</option>
          </select>
        </label>
        <span v-else class="preview-mode-chip">{{ user.operatorName || '运营商后台' }}</span
        ><button
          v-if="platformAdmin"
          class="text-button"
          @click="nav('audit')"
        >
          操作日志</button
        ><span>{{ user.displayName || user.username }}</span
        ><button class="text-button" @click="logout()">退出</button>
      </div>
    </header>
    <main class="main-content">
      <p v-if="!canWrite" class="remote-message">
        运营员账号：基础配置只读，可记录告警并处理分派给本人的报修。
      </p>
      <div class="tab-strip">
        <button class="active-tab">{{ title }}</button
        ><span class="tab-mode-note">{{ loadedAt ? '最近同步 ' + loadedAt : '尚未读取数据' }}</span
        ><button
          class="text-button remote-refresh"
          :disabled="busy || actionBusy"
          @click="page === 'reports' ? repairsPanel?.reload() : refresh()"
        >
          {{ busy ? '读取中…' : '刷新服务端数据' }}
        </button>
      </div>
      <p v-if="error" class="remote-error" role="alert">{{ error }}</p>
      <p v-if="message" class="remote-message" role="status">{{ message }}</p>
      <ManagementWorkspace v-if="managementPages.has(page)" :key="user.username + page + operatorFilter"
        :page="page" :client="client" :user="user" :operator-id="operatorFilter"
        :stations="data.stations" :operators="operators" :source="source" @updated="refresh" @order="openOrder" />
      <ConnectedDashboardPage
        v-else-if="page === 'dashboard'"
        :source="source"
        :client="client"
        :account-key="user.username"
        :loaded-at="loadedAt"
        :platform-admin="platformAdmin"
        @navigate="nav"
        @device="openDevice"
        @order="openOrder"
      />
      <OperationsPanel
        v-else-if="page === 'operations'"
        :show-statistics="false"
        :source="source"
        :client="client"
        :account-key="user.username"
        @device="openDevice"
        @order="openOrder"
        @navigate="nav"
      /><RepairsPanel
        v-else-if="page === 'reports'"
        ref="repairsPanel"
        :client="client"
        :enabled="user.features?.repairs === true"
        :admin="canWrite"
        :scope="scope"
        :station-ids="visibleStationIds"
        :operator-id="operatorFilter"
        @clear-scope="scope = {}"
      />
      <ConnectedCatalogPage
        v-else-if="page === 'stations' || page === 'devices'"
        :page="page"
        :title="title"
        :data="visibleData"
        :scope="scope"
        :station-name="scopedStationName"
        :abnormal-device-ids="abnormalDeviceIds"
        :can-write="canWrite"
        :can-manage-stations="platformAdmin"
        :operator-names="operatorNames"
        :navigation-version="navigationVersion"
        :loading="listLoading"
        :error="listError"
        @edit="editor = $event"
        @detail="dialog = $event"
        @device="openDevice"
        @clear-scope="scope = {}"
      />
      <ConnectedOrdersPage
        v-else-if="page === 'orders'"
        :title="title"
        :orders="visibleData.orders"
        :scope="scope"
        :station-name="stationName"
        :socket-name="socketName"
        :abnormal-device-ids="abnormalDeviceIds"
        :navigation-version="navigationVersion"
        :loading="listLoading"
        :error="listError"
        @detail="showOrder"
        @clear-scope="scope = {}"
      />
      <ConnectedRatesPage
        v-else-if="page === 'rates'"
        v-model:station-id="rateStation"
        :title="title"
        :stations="visibleData.stations"
        :rates="rates"
        :scope="scope"
        :station-name="scopedStationName"
        :can-write="canWrite"
        :navigation-version="navigationVersion"
        :loading="listLoading"
        :error="listError"
        :rates-busy="ratesBusy"
        :rates-error="ratesError"
        @edit="editor = $event"
        @reload="loadRates"
        @remove="removeRate"
        @clear-scope="scope = {}"
      />
      <ConnectedUsersPage
        :scope="scope"
        :station-name="scopedStationName"
        @clear-scope="scope = {}"
        v-else-if="page === 'users'"
        :title="title"
        :users="users"
        :can-write="canWrite"
        :navigation-version="navigationVersion"
        :loading="listLoading"
        :error="listError"
        :paging-disabled="usersBusy || busy || actionBusy"
        @change-page="loadUsers"
        @detail="dialog = $event"
      />
    </main>
    <div v-if="editor" class="modal-shade">
      <section class="modal-card" role="dialog" aria-modal="true" aria-label="业务数据编辑">
        <header><h2>维护业务数据</h2></header>
        <ConnectedEditor
          :key="editor.type + ':' + (editor.record?.id || 'new')"
          :client="client"
          :type="editor.type"
          :record="editor.record"
          :stations="visibleData.stations"
          :station-id="rateStation"
          @done="saved"
          @cancel="editor = null"
        />
      </section>
    </div>
    <ConnectedRecordDialog
      v-if="dialog"
      :dialog="dialog"
      :selected-sockets="selectedSockets"
      :station-name="stationName"
      :socket-name="socketName"
      :can-write="canWrite"
      :action-busy="actionBusy"
      :socket-busy="socketBusy"
      :audit="audit"
      :audit-busy="auditBusy"
      :audit-error="auditError"
      :error="error"
      @close="dialog = null"
      @navigate="nav"
      @edit-socket="editSocket"
      @change-socket="changeSocket"
      @toggle-user="toggleUser"
      @load-audit="loadAudit"
    />
  </div>
</template>
