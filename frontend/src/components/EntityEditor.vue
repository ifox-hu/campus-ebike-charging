<script setup>
import { reactive, computed, ref, watch } from 'vue';
import RateSchedulePanel from './RateSchedulePanel.vue';
import { servicePriceFor, servicePercentOf } from '../domain/serviceFees.js';
import { db, api, reportsView } from '../domain/store.js';
import StatusTag from './StatusTag.vue';
import StationLocationPicker from './StationLocationPicker.vue';
const props = defineProps({
  type: String,
  id: String,
  stationId: String,
  rowId: String,
  client: Object,
  user: Object,
});
const emit = defineEmits(['done', 'cancel']);
const existing =
  props.type === 'stations'
    ? db.stations.find((s) => s.id === props.id)
    : props.type === 'devices'
      ? db.devices.find((d) => d.id === props.id)
      : props.type === 'rows'
        ? db.rows.find((r) => r.id === props.id)
        : null;
const rate = props.type === 'rates' ? db.rates.find((r) => r.stationId === props.id) : null;
const report = computed(() => reportsView.value.find((r) => r.id === props.id));
const repairHistory = computed(() => {
  try {
    return JSON.parse(report.value?.progressHistory || '[]');
  } catch {
    return [];
  }
});
const selectedStation = existing?.stationId || props.stationId || db.stations[0]?.id || '';
const form = reactive({
  name: existing?.name || '',
  address: existing?.address || '',
  scene: existing?.scene || '校园',
  lat: existing?.lat ?? '',
  lng: existing?.lng ?? '',
  note: existing?.note || '',
  contactPhone: existing?.contactPhone || '',
  businessHours: existing?.businessHours || '',
  code: existing?.code || '',
  stationId: selectedStation,
  rowId:
    existing?.rowId ||
    props.rowId ||
    db.rows.find((r) => r.stationId === selectedStation)?.id ||
    '',
  position: existing?.position || '',
  portCount: 2,
  deviceCount: props.type === 'batch' ? 1 : 12,
  electricRate: rate?.electricRate ?? 0.6,
  serviceRate: rate?.serviceRate ?? 0.06,
  serviceFeePercent: servicePercentOf(rate?.electricRate, rate?.serviceRate),
  resolution: report.value?.resolution || '',
});
const schedulePreview = computed(() => {
  try {
    return [
      {
        startTime: '00:00:00',
        endTime: '23:59:59',
        electricityPrice: form.electricRate,
        servicePrice: servicePriceFor(form.electricRate, form.serviceFeePercent),
      },
    ];
  } catch {
    return [];
  }
});
const saving = ref(false),
  assigneesBusy = ref(false),
  assignees = ref([]),
  assignee = ref(report.value?.assigneeUsername || ''),
  reportStatus = ref(report.value?.status === 'processing' ? 'RESOLVED' : 'PROCESSING'),
  assigneesError = ref('');
watch(
  () => props.id,
  async (_, __, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    assignees.value = [];
    assigneesError.value = '';
    assigneesBusy.value = false;
    if (
      props.type !== 'reports' ||
      !props.client?.repairAssignees ||
      report.value?.status === 'resolved'
    )
      return;
    assigneesBusy.value = true;
    try {
      const candidates = await props.client.repairAssignees(props.id);
      if (active) assignees.value = candidates;
    } catch (failure) {
      if (active) assigneesError.value = failure.message;
    } finally {
      if (active) assigneesBusy.value = false;
    }
  },
  { immediate: true },
);
const error = ref(''),
  stationName = computed(() => db.stations.find((s) => s.id === props.id)?.name),
  availableRows = computed(() => db.rows.filter((r) => r.stationId === form.stationId)),
  batchRow = computed(() => db.rows.find((r) => r.id === props.rowId));
watch(
  () => form.stationId,
  () => {
    form.rowId = db.rows.find((r) => r.stationId === form.stationId)?.id || '';
    form.position = '';
  },
);
function selectLocation(point) {
  form.lat = point.latitude.toFixed(6);
  form.lng = point.longitude.toFixed(6);
  if (point.address) form.address = point.address.slice(0, 160);
}
async function save() {
  if (saving.value || assigneesBusy.value) return;
  saving.value = true;
  error.value = '';
  try {
    if (props.type === 'stations') api.saveStation(form, props.id);
    if (props.type === 'devices') api.saveDevice(form, props.id);
    if (props.type === 'rows') api.saveRow(form, props.id);
    if (props.type === 'batch') api.addDevicesToRow(props.rowId, form.deviceCount);
    if (props.type === 'rates')
      api.saveRate(
        props.id,
        form.electricRate,
        servicePriceFor(form.electricRate, form.serviceFeePercent),
      );
    if (props.type === 'reports') {
      if (props.client?.handleRepair)
        await props.client.handleRepair(props.id, {
          status: reportStatus.value,
          resolution: form.resolution,
          assigneeUsername: assignee.value,
        });
      else api.resolveReport(props.id, form.resolution);
    }
    emit('done');
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <form class="entity-form" @submit.prevent="save">
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <template v-if="type === 'stations'"
      ><label
        >站点名称 <b>*</b
        ><input
          v-model="form.name"
          required
          maxlength="60"
          placeholder="例如：图书馆示例站" /></label
      ><label
        >应用场景 <b>*</b
        ><select v-model="form.scene">
          <option>校园</option>
          <option>住宅小区</option>
          <option>医院</option>
          <option>产业园区</option>
          <option>办公区</option>
          <option>商业配套</option>
          <option>园区</option>
          <option>其他集中停车场所</option>
        </select></label
      ><label class="full-field"
        >地址 <b>*</b
        ><input
          v-model="form.address"
          required
          maxlength="160"
          placeholder="填写集中停车棚的具体位置" /></label
      ><StationLocationPicker
        :latitude="form.lat"
        :longitude="form.lng"
        :address="form.address"
        :fallback-position="[db.stations[0]?.lng, db.stations[0]?.lat]"
        @select="selectLocation"
      /><label
        >纬度（GCJ-02）<b>*</b
        ><input v-model="form.lat" type="number" required step="any" min="-90" max="90" /></label
      ><label
        >经度（GCJ-02）<b>*</b
        ><input v-model="form.lng" type="number" required step="any" min="-180" max="180" /></label
      ><label>联系电话<input v-model="form.contactPhone" maxlength="30" type="tel" /></label
      ><label
        >营业时间<input
          v-model="form.businessHours"
          maxlength="100"
          placeholder="例如：全天开放" /></label
      ><label class="full-field"
        >站点说明<textarea v-model="form.note" maxlength="400" rows="3" />
      </label>
      <p class="form-hint full-field">
        站点建立后，可新增 A 排、B 排等设备排，再在每排添加双插座设备。默认电费 0.60
        元/度，服务费按电价的10%计算，可在收费管理中调整比例。
      </p></template
    >
    <template v-else-if="type === 'devices'"
      ><label
        >设备编号 <b>*</b
        ><input v-model="form.code" required maxlength="30" placeholder="例如：EB-0201" /></label
      ><label
        >设备名称 <b>*</b
        ><input
          v-model="form.name"
          required
          maxlength="60"
          placeholder="例如：A排13号设备" /></label
      ><label
        >所属站点 <b>*</b
        ><select v-model="form.stationId" required>
          <option v-for="s in db.stations" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      ><label
        >所属设备排 <b>*</b
        ><select v-model="form.rowId" required>
          <option value="" disabled>请先新增设备排</option>
          <option v-for="row in availableRows" :key="row.id" :value="row.id">{{ row.name }}</option>
        </select></label
      ><label
        >排内序号<input
          v-model.number="form.position"
          type="number"
          min="1"
          step="1"
          placeholder="留空则追加到本排末尾" /></label
      ><label
        >设备规格<input value="双插座设备：A / B 两个独立插座" readonly aria-label="设备规格"
      /></label>
      <p class="form-hint full-field">
        一台设备固定两个插座；需要增加充电位置时，追加设备或新增设备排。正在充电或异常占用的设备不能移动位置。
      </p></template
    >
    <template v-else-if="type === 'rows'"
      ><label
        >所属站点 <b>*</b
        ><select v-model="form.stationId" :disabled="!!id" required>
          <option v-for="s in db.stations" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      ><label
        >设备排名称 <b>*</b
        ><input
          v-model="form.name"
          required
          maxlength="30"
          placeholder="例如：C排 / 东侧第2排" /></label
      ><label v-if="!id"
        >本排初始设备数 <b>*</b
        ><input v-model.number="form.deviceCount" type="number" required min="1" max="100" step="1"
      /></label>
      <div v-if="!id" class="row-capacity-preview">
        <strong>{{ Number(form.deviceCount) || 0 }} 台 × 2 插座</strong
        ><span>合计 {{ (Number(form.deviceCount) || 0) * 2 }} 个插座</span>
      </div>
      <p class="form-hint full-field">
        一排常用十几台设备，可填写实际数量，之后也能逐台或批量追加。站点内可以建立多排，设备编号会自动生成。
      </p></template
    >
    <template v-else-if="type === 'batch'"
      ><p class="form-hint full-field">
        向 {{ db.stations.find((s) => s.id === batchRow?.stationId)?.name }} ·
        {{ batchRow?.name }} 追加双插座设备。
      </p>
      <label
        >追加设备数量 <b>*</b
        ><input v-model.number="form.deviceCount" type="number" required min="1" max="100" step="1"
      /></label>
      <div class="row-capacity-preview">
        <strong>新增 {{ Number(form.deviceCount) || 0 }} 台设备</strong
        ><span>增加 {{ (Number(form.deviceCount) || 0) * 2 }} 个独立插座</span>
      </div>
      <p class="form-hint full-field">
        自动按本排末尾继续编号，每台都包含 A、B 两个插座。已有设备和历史订单保持不变。
      </p></template
    >
    <template v-else-if="type === 'rates'"
      ><p class="form-hint full-field">站点：{{ stationName }}。以下费率仅影响之后开始的订单。</p>
      <label
        >电费单价（元/度）<b>*</b
        ><input
          v-model.number="form.electricRate"
          type="number"
          required
          min="0"
          step="0.01" /></label
      ><label
        >服务费占电价比例（%）<b>*</b
        ><input
          v-model.number="form.serviceFeePercent"
          type="number"
          required
          min="0"
          max="100"
          step="any" /></label
      ><RateSchedulePanel class="full-field" :rates="schedulePreview" />
      <p class="form-hint full-field">
        填写10表示服务费为电价的10%，例如电价0.60元/度，服务费为0.06元/度。电费与服务费分项累计、四舍五入到分后相加。
      </p></template
    >
    <template v-else-if="type === 'reports'"
      ><div class="full-field report-context">
        <StatusTag
          :text="
            report.status === 'pending'
              ? '待处理'
              : report.status === 'processing'
                ? '处理中'
                : '已处理'
          "
        />
        <p>{{ report.socket?.station?.name }} / {{ report.socket?.code }}</p>
        <p>{{ report.description }}</p>
        <small>提交人：{{ report.user?.name }} · {{ report.createdAt }}</small>
        <ol>
          <li v-for="(event, i) in repairHistory" :key="i">
            {{ event.at }} · {{ event.status === 'RESOLVED' ? '已处理' : '处理中' }} ·
            {{ event.note || '已受理' }}
          </li>
        </ol>
      </div>
      <template v-if="report.status !== 'resolved' && client?.handleRepair"
        ><label class="full-field"
          >处理人员<select v-model="assignee" aria-label="报修处理人员">
            <option value="">由当前处理人负责</option>
            <option
              v-if="assignee && !assignees.some((row) => row.username === assignee)"
              :value="assignee"
              disabled
            >
              {{ assignee }}（原负责人）
            </option>
            <option v-for="member in assignees" :key="member.username" :value="member.username">
              {{ member.displayName || member.username }} · {{ member.username }}
            </option>
          </select></label
        ><label class="full-field"
          >处理状态<select v-model="reportStatus" aria-label="报修处理状态">
            <option value="PROCESSING">处理中</option>
            <option value="RESOLVED">已处理</option>
          </select></label
        >
        <p v-if="assigneesError" class="form-error full-field">{{ assigneesError }}</p></template
      ><label class="full-field"
        >处理说明 <b>*</b
        ><textarea
          v-model="form.resolution"
          required
          rows="4"
          maxlength="500"
          :readonly="report.status === 'resolved'"
          placeholder="填写检查结果、处理措施及后续安排"
        />
      </label>
      <p v-if="report.resolvedAt" class="form-hint full-field">处理时间：{{ report.resolvedAt }}</p>
      <p class="form-hint full-field">
        保存处理结果不会自动恢复插座故障，请在设备页面单独核验。
      </p></template
    >
    <footer class="form-actions full-field">
      <button class="outline-button" type="button" @click="emit('cancel')">取消</button
      ><button
        v-if="!(type === 'reports' && report?.status === 'resolved')"
        class="soft-button active"
        :disabled="saving || assigneesBusy"
        type="submit"
      >
        {{ type === 'reports' ? '保存处理结果' : type === 'batch' ? '确认追加' : '保存' }}
      </button>
    </footer>
  </form>
</template>
