<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
const props = defineProps({ client: Object, user: Object, operatorId: { default: '' } });
const rows = ref([]);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const dialog = ref(null);
const empty = () => ({ username: '', displayName: '', password: '', role: 'OPERATOR' });
const form = ref(empty());
let revision = 0;
async function load() {
  const request = ++revision;
  busy.value = true;
  error.value = '';
  try {
    const data = await props.client.team(props.operatorId);
    if (request === revision) rows.value = data;
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
function open(type, row = null) {
  form.value = empty();
  dialog.value = { type, row };
  error.value = '';
  notice.value = '';
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  const request = revision;
  try {
    if (dialog.value.type === 'create') await props.client.createTeam(form.value, props.operatorId);
    else if (dialog.value.type === 'reset')
      await props.client.resetTeamPassword(
        dialog.value.row.id,
        form.value.password,
        props.operatorId,
      );
    else
      await props.client.setTeamEnabled(
        dialog.value.row.id,
        !dialog.value.row.enabled,
        props.operatorId,
      );
    if (request !== revision) return;
    form.value = empty();
    dialog.value = null;
    notice.value = '团队账号已更新。';
    await load();
  } catch (failure) {
    if (request === revision && !failure.stale) error.value = failure.message;
  } finally {
    if (request === revision) busy.value = false;
  }
}
onMounted(load);
onBeforeUnmount(() => {
  revision++;
  form.value = empty();
});
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <h1>团队账号</h1>
        <p>运营商管理员维护本方后台人员，运营员负责日常报修和告警处理。</p>
      </div>
      <button class="soft-button active" :disabled="busy" @click="open('create')">新增成员</button>
    </header>
    <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="mg-notice" role="status">{{ notice }}</p>
    <div class="mg-table-wrap">
      <table class="management-table">
        <thead>
          <tr>
            <th>账号</th>
            <th>名称</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.username }}</td>
            <td>{{ row.displayName }}</td>
            <td>{{ row.role === 'OPERATOR_ADMIN' ? '运营商管理员' : '运营员' }}</td>
            <td>{{ row.enabled ? '启用' : '停用' }}</td>
            <td>
              <div class="mg-actions">
                <button
                  class="table-link"
                  :disabled="busy || row.username === user.username"
                  @click="open('status', row)"
                >
                  {{ row.enabled ? '停用' : '启用' }}</button><button
                  class="table-link"
                  :disabled="busy || row.username === user.username"
                  @click="open('reset', row)"
                >
                  重置密码
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="5" class="empty-table">
              {{ busy ? '正在读取团队账号…' : '暂无团队账号' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="dialog" class="modal-shade">
      <section
        class="modal-card mg-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="团队账号维护"
      >
        <header>
          <h2>
            {{
              { create: '新增团队成员', reset: '重置成员密码', status: '修改成员状态' }[dialog.type]
            }}
          </h2>
          <button :disabled="busy" aria-label="关闭团队账号窗口" @click="dialog = null">
            关闭
          </button>
        </header>
        <form class="mg-form" @submit.prevent="save">
          <template v-if="dialog.type === 'create'"
            ><label
              >登录账号<input
                v-model="form.username"
                required
                pattern="[a-zA-Z0-9_]{3,30}"
                maxlength="30"
                autocomplete="off" /></label
            ><label>显示名称<input v-model="form.displayName" required maxlength="50" /></label
            ><label
              >角色<select v-model="form.role">
                <option value="OPERATOR">运营员</option>
                <option value="OPERATOR_ADMIN">运营商管理员</option>
              </select></label
            ></template
          >
          <label v-if="dialog.type !== 'status'"
            >{{ dialog.type === 'create' ? '初始密码' : '新密码'
            }}<input
              v-model="form.password"
              type="password"
              required
              minlength="10"
              maxlength="64"
              pattern="(?=.*[a-zA-Z])(?=.*[0-9]).{10,64}"
              title="10至64个字符，包含字母和数字"
              autocomplete="new-password"
          /></label>
          <p v-else>
            确认{{ dialog.row.enabled ? '停用' : '启用' }}账号 {{ dialog.row.username }}？
          </p>
          <p v-if="error" class="mg-error" role="alert">{{ error }}</p>
          <footer class="mg-actions">
            <button class="outline-button" type="button" :disabled="busy" @click="dialog = null">
              取消</button
            ><button class="soft-button active" :disabled="busy">
              {{ busy ? '正在保存…' : '确认保存' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </section>
</template>
