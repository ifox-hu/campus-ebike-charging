import test from 'node:test';
import assert from 'node:assert/strict';
import * as tariff from '../src/domain/rateSchedule.js';

const periods = [
  { id: 1, startTime: '00:00:00', endTime: '08:00:00', electricityPrice: 0.4, servicePrice: 0.04 },
  { id: 2, startTime: '08:00:00', endTime: '22:00:00', electricityPrice: 0.8, servicePrice: 0.08 },
  { id: 3, startTime: '22:00:00', endTime: '23:59:59', electricityPrice: 0.4, servicePrice: 0.04 },
];
test('全天费率按时间排序，识别缺口、重叠及非法时刻', () => {
  const result = tariff.analyzeSchedule([...periods].reverse());
  assert.equal(result.complete, true);
  assert.deepEqual(
    result.segments.map((s) => s.id),
    [1, 2, 3],
  );
  assert.equal(tariff.analyzeSchedule(periods.filter((p) => p.id !== 2)).issues[0].kind, 'gap');
  assert.ok(
    tariff
      .analyzeSchedule([...periods, { ...periods[0], id: 4, endTime: '09:00:00' }])
      .issues.some((i) => i.kind === 'overlap'),
  );
  assert.equal(tariff.analyzeSchedule([{ ...periods[0], startTime: '24:00:00' }]).complete, false);
  assert.equal(tariff.analyzeSchedule([{ ...periods[0], electricityPrice: -1 }]).complete, false);
});
test('编辑费率排除自身，允许相邻并在保存前拒绝冲突', () => {
  assert.doesNotThrow(() =>
    tariff.validateRateChange(periods, { ...periods[1], electricityPrice: 0.9 }, 2),
  );
  assert.throws(
    () => tariff.validateRateChange(periods, { ...periods[1], startTime: '07:59:59' }, 2),
    /重叠/,
  );
  assert.throws(() => tariff.validateRateChange([], { ...periods[0], endTime: '29:00' }), /时间/);
});
test('计费预览按恒定功率跨时段跨午夜分项计算，配置缺口不生成虚假金额', () => {
  const result = tariff.estimateCharge(periods, {
    startTime: '07:00',
    minutes: 120,
    powerWatts: 300,
  });
  assert.deepEqual(result, { energyKwh: 0.6, electricityFee: 0.36, serviceFee: 0.04, total: 0.4 });
  assert.deepEqual(
    tariff.estimateCharge(periods, { startTime: '23:30', minutes: 60, powerWatts: 300 }),
    { energyKwh: 0.3, electricityFee: 0.12, serviceFee: 0.01, total: 0.13 },
  );
  assert.throws(
    () =>
      tariff.estimateCharge(periods.slice(1), {
        startTime: '07:00',
        minutes: 120,
        powerWatts: 300,
      }),
    /完整/,
  );
  assert.throws(
    () => tariff.estimateCharge(periods, { startTime: '07:00', minutes: 0, powerWatts: 300 }),
    /时长/,
  );
});
