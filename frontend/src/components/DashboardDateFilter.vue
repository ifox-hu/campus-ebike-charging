<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { dashboardRange } from '../domain/dashboardPeriod.js';
const props = defineProps({
  modelValue: { type: Object, default: () => dashboardRange('threeMonths') },
});
const emit = defineEmits(['update:modelValue', 'period']);
const root = ref(null),
  trigger = ref(null),
  open = ref(false),
  selected = ref('threeMonths'),
  draft = ref('threeMonths'),
  start = ref(props.modelValue?.start || ''),
  end = ref(props.modelValue?.end || ''),
  error = ref('');
const choices = [
  ['today', '今日'],
  ['week', '近七天'],
  ['month', '近一个月'],
  ['threeMonths', '近三个月'],
  ['all', '全部'],
  ['custom', '自定义'],
];
const label = computed(() => choices.find(([id]) => id === selected.value)?.[1]);
watch(
  () => props.modelValue,
  (range) => {
    if (!open.value) {
      start.value = range?.start || '';
      end.value = range?.end || '';
    }
  },
);
function toggle() {
  if (!open.value) {
    draft.value = selected.value;
    start.value = props.modelValue?.start || '';
    end.value = props.modelValue?.end || '';
    error.value = '';
  }
  open.value = !open.value;
}
function choose(id) {
  draft.value = id;
  error.value = '';
  if (id === 'custom') return;
  const range = dashboardRange(id);
  start.value = range?.start || '';
  end.value = range?.end || '';
}
function close() {
  open.value = false;
  trigger.value?.focus();
}
function outside(event) {
  if (!root.value?.contains(event.target)) open.value = false;
}
function leave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) open.value = false;
}
function apply() {
  try {
    const range = dashboardRange(draft.value, undefined, { start: start.value, end: end.value });
    selected.value = draft.value;
    emit('update:modelValue', range);
    emit('period', draft.value);
    error.value = '';
    close();
  } catch (e) {
    error.value = e.message;
  }
}
onMounted(() => document.addEventListener('pointerdown', outside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside));
</script>
<template>
  <div ref="root" class="dashboard-date-filter" @keydown.esc.stop.prevent="close" @focusout="leave">
    <button
      ref="trigger"
      type="button"
      class="date-trigger"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-label="仪表盘时间筛选"
      @click="toggle"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 2v6m10-6v6M3 11h18" />
      </svg>
      <span>{{ label }}</span>
      <svg
        class="chevron"
        :class="{ expanded: open }"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <path d="m5 7 5 5 5-5" />
      </svg>
    </button>
    <span class="applied-range" data-testid="dashboard-applied-range">{{
      modelValue ? `${modelValue.start} 至 ${modelValue.end}` : '全部时间'
    }}</span>
    <div v-if="open" class="date-popover" role="dialog" aria-label="选择仪表盘时间范围">
      <form @submit.prevent="apply">
        <div class="date-presets" role="group" aria-label="仪表盘时间范围">
          <button
            v-for="[id, text] in choices"
            :key="id"
            type="button"
            :class="{ active: draft === id }"
            :aria-pressed="draft === id"
            @click="choose(id)"
          >
            {{ text }}
          </button>
        </div>
        <div v-if="draft !== 'all'" class="custom-range">
          <label
            >开始日期<input
              v-model="start"
              type="date"
              aria-label="仪表盘开始日期"
              @input="draft = 'custom'"
          /></label>
          <span>至</span>
          <label
            >结束日期<input
              v-model="end"
              type="date"
              aria-label="仪表盘结束日期"
              @input="draft = 'custom'"
          /></label>
        </div>
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="popover-footer">
          <span>{{ draft === 'all' ? '查看全部时间的数据' : '选择时间范围后应用' }}</span><button
            type="submit"
            class="apply-range"
          >
            应用
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<style scoped>
.dashboard-date-filter {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}
.date-trigger {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid #dedbea;
  border-radius: 7px;
  background: #fff;
  color: #645c75;
  font: inherit;
  font-size: 13px;
}
.date-trigger:hover,
.date-trigger[aria-expanded='true'] {
  border-color: #6962ff;
  color: #6962ff;
}
.date-trigger svg {
  width: 18px;
  height: 18px;
}
.date-trigger .chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.18s;
}
.chevron.expanded {
  transform: rotate(180deg);
}
.date-popover {
  position: absolute;
  top: calc(100% + 9px);
  left: 0;
  z-index: 40;
  width: 360px;
  max-width: calc(100vw - 56px);
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid #e4e0ed;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 36px #35235d24;
}
.date-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 18px;
}
.date-presets button {
  padding: 9px 8px;
  border: 1px solid #e4e0ed;
  border-radius: 6px;
  color: #777083;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
}
.date-presets button.active {
  background: #6962ff;
  border-color: #6962ff;
  color: white;
}
.date-presets button:hover:not(.active) {
  background: #f0edff;
}
.custom-range {
  display: flex;
  gap: 8px;
  align-items: end;
  color: #8b8499;
  font-size: 12px;
}
.custom-range label {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.custom-range > span {
  padding-bottom: 10px;
}
.custom-range input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 7px;
  border: 1px solid #dedbea;
  border-radius: 6px;
  background: #fff;
  color: #645c75;
  font: inherit;
  min-width: 0;
}
.popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #efedf4;
  font-size: 12px;
  color: #9a93a6;
}
.apply-range {
  padding: 9px 22px;
  border-radius: 6px;
  background: #6962ff;
  color: #fff;
}
.applied-range {
  color: #9a93a6;
  font-size: 12px;
}
.dashboard-date-filter p {
  margin: 10px 0 0;
  color: #b74756;
  font-size: 12px;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #6962ff;
  outline-offset: 2px;
}
@media (max-width: 520px) {
  .date-popover {
    width: 320px;
    max-width: 100%;
    padding: 12px;
  }
}
</style>
