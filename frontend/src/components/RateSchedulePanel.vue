<script setup>
import { computed, reactive } from 'vue';
import { analyzeSchedule, estimateCharge } from '../domain/rateSchedule.js';
const props = defineProps({ rates: { type: Array, default: () => [] }, loading: Boolean });
const schedule = computed(() => analyzeSchedule(props.rates));
const preview = reactive({ startTime: '08:00', minutes: 120, powerWatts: 300 });
const estimate = computed(() => {
  try {
    return { value: estimateCharge(props.rates, preview) };
  } catch (error) {
    return { error: error.message };
  }
});
const percent = (rate) =>
  rate.electricityPrice > 0
    ? `${Number(((rate.servicePrice / rate.electricityPrice) * 100).toFixed(2))}%`
    : '—';
</script>
<template>
  <section class="rate-schedule" aria-label="全天费率与计费预览" :aria-busy="loading">
    <header>
      <h2>全天费率</h2>
      <span :class="schedule.complete ? 'schedule-ok' : 'schedule-warning'">{{
        loading ? '正在读取' : schedule.complete ? '已覆盖全天' : '配置未完整'
      }}</span>
    </header>
    <template v-if="!loading">
      <div class="rate-timeline" aria-label="24小时费率时间轴">
        <div
          v-for="(rate, index) in schedule.segments"
          :key="rate.id ?? index"
          class="rate-segment"
          :class="`rate-tone-${index % 3}`"
          :style="{ left: `${rate.start / 864}%`, width: `${(rate.end - rate.start) / 864}%` }"
          :title="`${rate.label}，电价${rate.electricityPrice}元/度，服务费${rate.servicePrice}元/度`"
        >
          <span>{{ rate.electricityPrice.toFixed(2) }}</span>
        </div>
      </div>
      <div class="timeline-ticks">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
      <ul v-if="schedule.issues.length" class="rate-issues" role="status">
        <li v-for="(issue, index) in schedule.issues" :key="index">{{ issue.message }}</li>
      </ul>
      <div class="rate-breakdown">
        <article v-for="(rate, index) in schedule.segments" :key="rate.id ?? index">
          <strong>{{ rate.label }}</strong><span
            >电价 {{ rate.electricityPrice.toFixed(2) }} 元/度</span
          ><span>服务费 {{ rate.servicePrice.toFixed(4) }} 元/度（{{ percent(rate) }}）</span>
        </article>
      </div>
      <div class="rate-estimator">
        <h3>计费预览</h3>
        <div class="estimate-fields">
          <label
            >开始时间<input
              v-model="preview.startTime"
              type="time"
              aria-label="预览开始时间" /></label
          ><label
            >充电时长（分钟）<input
              v-model="preview.minutes"
              type="number"
              min="1"
              max="720"
              step="1"
              aria-label="预览充电时长" /></label
          ><label
            >充电功率（W）<input
              v-model="preview.powerWatts"
              type="number"
              min="1"
              max="10000"
              aria-label="预览充电功率"
          /></label>
        </div>
        <p v-if="estimate.error" class="estimate-hint">{{ estimate.error }}</p>
        <p v-else class="estimate-result" role="status">
          预计电量 <strong>{{ estimate.value.energyKwh.toFixed(3) }} 度</strong
          ><span>电费 {{ estimate.value.electricityFee.toFixed(2) }} 元</span
          ><span>服务费 {{ estimate.value.serviceFee.toFixed(2) }} 元</span
          ><strong>合计 {{ estimate.value.total.toFixed(2) }} 元</strong>
        </p>
        <p class="estimate-hint">按填写的恒定功率估算，跨时段分别计费；实际账单按订单电量结算。</p>
      </div>
    </template>
  </section>
</template>
<style scoped>
.rate-schedule {
  margin: 16px 0;
  padding: 20px;
  border: 1px solid #e8e4f1;
  border-radius: 12px;
  background: #fff;
  min-width: 0;
}
.rate-schedule header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.rate-schedule h2,
.rate-schedule h3 {
  margin: 0;
  font-size: 15px;
  color: #39334c;
}
.rate-schedule header > span {
  font-size: 12px;
}
.schedule-ok {
  color: #23835d;
}
.schedule-warning,
.rate-issues {
  color: #ad681a;
}
.rate-timeline {
  position: relative;
  height: 32px;
  background: repeating-linear-gradient(135deg, #f1eff5, #f1eff5 6px, #fff 6px, #fff 12px);
  border-radius: 5px;
  overflow: hidden;
}
.rate-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1px;
  border-right: 1px solid #fff9;
  font-size: 12px;
  color: #fff;
  overflow: hidden;
}
.rate-tone-0 {
  background: #7970d9;
}
.rate-tone-1 {
  background: #379c9b;
}
.rate-tone-2 {
  background: #bd9050;
}
.timeline-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 11px;
  color: #8a8495;
}
.rate-issues {
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
}
.rate-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.rate-breakdown article {
  display: grid;
  gap: 5px;
  padding: 10px 14px;
  background: #f8f7fc;
  border-radius: 6px;
  font-size: 12px;
  color: #736a82;
}
.rate-breakdown strong {
  color: #514766;
}
.rate-estimator {
  border-top: 1px solid #efedf4;
  margin-top: 18px;
  padding-top: 16px;
}
.estimate-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
}
.estimate-fields label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #736a82;
}
.estimate-fields input {
  width: 135px;
  max-width: 100%;
  padding: 8px;
  border: 1px solid #ded8e9;
  border-radius: 5px;
  color: #514766;
  font: inherit;
}
.estimate-result {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  font-size: 13px;
  color: #6a617a;
  line-height: 1.8;
}
.estimate-result strong {
  color: #5143ad;
}
.estimate-hint {
  font-size: 12px;
  line-height: 1.8;
  color: #938a9f;
}
@media (max-width: 520px) {
  .rate-schedule {
    padding: 14px;
  }
  .estimate-fields label,
  .estimate-fields input {
    width: 100%;
  }
  .rate-breakdown article {
    width: 100%;
  }
}
</style>
