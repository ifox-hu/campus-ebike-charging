const DAY_SECONDS = 86400;
function seconds(value) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(value))) return NaN;
  const [hour, minute, second = 0] = value.split(':').map(Number);
  return hour < 24 && minute < 60 && second < 60 ? hour * 3600 + minute * 60 + second : NaN;
}
function clock(value) {
  return value === DAY_SECONDS
    ? '24:00'
    : `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}`;
}
function segment(rate) {
  const start = seconds(rate.startTime),
    rawEnd = seconds(rate.endTime),
    end = rawEnd === 86399 ? DAY_SECONDS : rawEnd;
  const electric = Number(rate.electricityPrice),
    service = Number(rate.servicePrice);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    throw Error('时间格式无效，开始时间须早于结束时间。');
  if (
    rate.electricityPrice == null ||
    rate.electricityPrice === '' ||
    rate.servicePrice == null ||
    rate.servicePrice === '' ||
    !Number.isFinite(electric) ||
    !Number.isFinite(service) ||
    electric < 0 ||
    service < 0
  )
    throw Error('电价和服务费须为非负数。');
  return {
    ...rate,
    start,
    end,
    electricityPrice: electric,
    servicePrice: service,
    label: `${clock(start)}—${clock(end)}`,
  };
}
export function analyzeSchedule(rates = []) {
  const segments = [],
    issues = [];
  for (const rate of rates) {
    try {
      segments.push(segment(rate));
    } catch (error) {
      issues.push({ kind: 'invalid', message: error.message });
    }
  }
  segments.sort((a, b) => a.start - b.start);
  let covered = 0;
  for (const item of segments) {
    if (item.start > covered)
      issues.push({
        kind: 'gap',
        start: covered,
        end: item.start,
        message: `${clock(covered)}—${clock(item.start)} 尚未配置费率`,
      });
    if (item.start < covered)
      issues.push({
        kind: 'overlap',
        start: item.start,
        end: Math.min(covered, item.end),
        message: `${item.label} 与其他时段重叠`,
      });
    covered = Math.max(covered, item.end);
  }
  if (covered < DAY_SECONDS)
    issues.push({
      kind: 'gap',
      start: covered,
      end: DAY_SECONDS,
      message: `${clock(covered)}—24:00 尚未配置费率`,
    });
  return { segments, issues, complete: issues.length === 0 };
}
export function validateRateChange(rates, candidate, id) {
  segment(candidate);
  const others = rates.filter((rate) => id == null || String(rate.id) !== String(id));
  const schedule = analyzeSchedule([...others, candidate]);
  const conflict = schedule.issues.find(
    (issue) => issue.kind === 'overlap' || issue.kind === 'invalid',
  );
  if (conflict) throw Error(conflict.message);
  return schedule;
}
export function estimateCharge(rates, { startTime, minutes, powerWatts }) {
  const schedule = analyzeSchedule(rates);
  if (!schedule.complete) throw Error('请先配置完整的全天费率。');
  const start = seconds(startTime),
    duration = Number(minutes),
    watts = Number(powerWatts);
  if (!Number.isFinite(start)) throw Error('请选择有效开始时间。');
  if (!Number.isInteger(duration) || duration < 1 || duration > 720)
    throw Error('时长须为1—720分钟。');
  if (!Number.isFinite(watts) || watts <= 0 || watts > 10000)
    throw Error('功率须大于0且不超过10000 W。');
  let cursor = start,
    left = duration * 60,
    electricity = 0,
    service = 0;
  while (left > 0) {
    const time = cursor % DAY_SECONDS,
      item = schedule.segments.find((rate) => time >= rate.start && time < rate.end);
    const elapsed = Math.min(left, item.end - time),
      energy = ((watts / 1000) * elapsed) / 3600;
    electricity += energy * item.electricityPrice;
    service += energy * item.servicePrice;
    cursor += elapsed;
    left -= elapsed;
  }
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const electricityFee = round(electricity),
    serviceFee = round(service);
  return {
    energyKwh: Number((((watts / 1000) * duration) / 60).toFixed(3)),
    electricityFee,
    serviceFee,
    total: round(electricityFee + serviceFee),
  };
}
