import { today } from './service.js'

const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
export function dashboardRange(period, end=today(), custom={}) {
 if(period==='all')return null
 if(period==='sixMonths'){
  if(!validDate(end))throw Error('日期范围无效。')
  const start=new Date(`${end.slice(0,7)}-01T00:00:00Z`);start.setUTCMonth(start.getUTCMonth()-5)
  return {start:start.toISOString().slice(0,10),end,granularity:'month'}
 }
 if(period==='custom'){
  if(!validDate(custom.start)||!validDate(custom.end)||custom.start>custom.end||(Date.parse(custom.end)-Date.parse(custom.start))/86400000>365)throw Error('请选择有效日期区间，开始日期不能晚于结束日期，最长为一年。')
  return {start:custom.start,end:custom.end}
 }
 const days={today:1,week:7,month:30}[period]
 if(!days||!validDate(end))throw Error('日期范围无效。')
 const start=new Date(`${end}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-days+1)
 return {start:start.toISOString().slice(0,10),end}
}
export function inDashboardRange(value,range){const day=String(value||'').slice(0,10);return !range||Boolean(day&&day>=range.start&&day<=range.end)}
export function dashboardRangeForSource(source,range,end=today()){
 if(range)return range
 const dates=[end,...(source.orders||[]).flatMap(o=>[o.startedAt,o.endedAt]),...(source.users||[]).map(u=>u.createdAt)].map(v=>String(v||'').slice(0,10)).filter(validDate).sort()
 return {start:dates[0],end:dates.at(-1),all:true}
}
