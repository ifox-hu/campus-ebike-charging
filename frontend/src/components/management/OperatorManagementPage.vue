<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import TeamAccountsPage from './TeamAccountsPage.vue';
const props = defineProps({ client: Object, stations: Array });
const emit = defineEmits(['updated']);
const rows = ref([]);
const selected = ref('');
const error = ref('');
const notice = ref('');
const busy = ref(false);
const dialog = ref(null);
const stationId = ref('');
const empty = () => ({
  name: '',
  contactName: '',
  phone: '',
  enabled: true,
  cooperationStatus: 'ACTIVE',
});
const form = ref(empty());
const active = computed(() => rows.value.find((row) => String(row.id) === selected.value));
const sites = computed(() =>
  (props.stations || []).filter((row) => String(row.operatorId ?? 1) === selected.value),
);
let revision = 0;
async function load() {
  const request = ++revision;
  busy.value = true;
  error.value = '';
  try {
    const data = await props.client.operators();
    if (request !== revision) return;
    rows.value = data;
    if (!data.some((row) => String(row.id) === selected.value))
      selected.value = String(data[0]?.id || '');
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
function open(row = null) {
  form.value = row ? { ...empty(), ...row } : empty();
  dialog.value = { id: row?.id };
  notice.value = '';
  error.value = '';
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  const request = revision;
  try {
    const value = {
      ...form.value,
      name: form.value.name.trim(),
      enabled: form.value.cooperationStatus === 'ACTIVE',
    };
    const data = dialog.value.id
      ? await props.client.updateOperator(dialog.value.id, value)
      : await props.client.createOperator(value);
    if (request !== revision) return;
    selected.value = String(data.id);
    dialog.value = null;
    notice.value = '运营商资料已保存。';
    await load();
    emit('updated');
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
async function assign() {
  if (busy.value || !stationId.value || !selected.value) return;
  busy.value = true;
  error.value = '';
  const request = revision;
  try {
    await props.client.assignStation(stationId.value, selected.value);
    if (request !== revision) return;
    stationId.value = '';
    notice.value = '站点归属已更新。';
    emit('updated');
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
onMounted(load);
onBeforeUnmount(() => {
  revision++;
});
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <h1>运营商管理</h1>
        <p>维护合作资料、站点归属和后台账号。</p>
      </div>
      <button class="soft-button active" :disabled="busy" @click="open()">新增运营商</button>
    </header>
    <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="mg-notice" role="status">{{ notice }}</p>
    <div class="mg-filters">
      <label
        >合作运营商<select
          v-model="selected"
          :disabled="busy"
          @change="
            stationId = '';
            notice = '';
            error = '';
          "
        >
          <option v-for="row in rows" :key="row.id" :value="String(row.id)">{{ row.name }}</option>
        </select></label
      ><button class="outline-button" :disabled="busy" @click="load">刷新列表</button>
    </div>
    <template v-if="active"
      ><div class="mg-profile">
        <div>
          <h2>{{ active.name }}</h2>
          <p>
            {{
              active.enabled === false || active.cooperationStatus === 'SUSPENDED'
                ? '暂停合作'
                : active.cooperationStatus === 'TERMINATED'
                  ? '终止合作'
                  : '合作中'
            }}
          </p>
        </div>
        <dl>
          <div>
            <dt>联系人</dt>
            <dd>{{ active.contactName || '—' }}</dd>
          </div>
          <div>
            <dt>联系电话</dt>
            <dd>{{ active.phone || '—' }}</dd>
          </div>
          <div>
            <dt>名下站点</dt>
            <dd>{{ sites.length }} 个</dd>
          </div>
        </dl>
        <button class="outline-button" :disabled="busy" @click="open(active)">编辑合作资料</button>
      </div>
      <h2 class="mg-subheading">名下站点</h2>
      <div class="mg-table-wrap">
        <table class="management-table">
          <thead>
            <tr>
              <th>站点名称</th>
              <th>地址</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="site in sites" :key="site.id">
              <td>{{ site.name }}</td>
              <td>{{ site.address }}</td>
              <td>
                {{
                  { OPERATING: '运营中', CLOSED: '停业', MAINTENANCE: '维护中' }[site.status] ||
                  (site.enabled === false ? '停业' : '运营中')
                }}
              </td>
            </tr>
            <tr v-if="!sites.length">
              <td colspan="3" class="empty-table">尚未分配站点</td>
            </tr>
          </tbody>
        </table>
      </div>
      <form class="mg-filters" @submit.prevent="assign">
        <label
          >分配站点<select v-model="stationId" required :disabled="busy">
            <option value="">请选择站点</option>
            <option v-for="site in stations" :key="site.id" :value="site.id">
              {{ site.name }}
            </option>
          </select></label
        ><button class="outline-button" :disabled="busy || !stationId">分配给当前运营商</button>
      </form>
      <TeamAccountsPage
        :key="selected"
        :client="client"
        :user="{ role: 'ADMIN', username: '' }"
        :operator-id="selected"
      />
    </template>
    <p v-else class="mg-notice">{{ busy ? '正在读取运营商…' : '暂无合作运营商，请先新增。' }}</p>
    <div v-if="dialog" class="modal-shade">
      <section class="modal-card mg-dialog" role="dialog" aria-modal="true" aria-label="运营商资料">
        <header>
          <h2>{{ dialog.id ? '编辑运营商' : '新增运营商' }}</h2>
          <button :disabled="busy" @click="dialog = null">关闭</button>
        </header>
        <form class="mg-form" @submit.prevent="save">
          <label>运营商名称<input v-model="form.name" required maxlength="80" /></label
          ><label>联系人<input v-model="form.contactName" maxlength="50" /></label
          ><label>联系电话<input v-model="form.phone" type="tel" maxlength="30" /></label
          ><label
            >合作状态<select v-model="form.cooperationStatus">
              <option value="ACTIVE">合作中</option>
              <option value="SUSPENDED">暂停合作</option>
              <option value="TERMINATED">终止合作</option>
            </select></label
          >
          <p v-if="form.cooperationStatus !== 'ACTIVE'" class="mg-notice">
            暂停或终止合作后，名下站点停止接收新订单，进行中的充电继续完成。
          </p>
          <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
          <footer class="mg-actions">
            <button class="outline-button" type="button" :disabled="busy" @click="dialog = null">
              取消</button
            ><button class="soft-button active" :disabled="busy">保存资料</button>
          </footer>
        </form>
      </section>
    </div>
  </section>
</template>
