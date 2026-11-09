import {availableCount} from './charging.mjs';
export function buildMessages(orders=[],reports=[]){
 const result=[];
 for(const order of orders){
  if(['starting','charging','ended','failed'].includes(order.status)){
   const phase=order.status==='starting'?'starting':order.status==='failed'?'failed':'started';
   result.push({id:`order:${order.id}:${phase}`,time:order.startedAt||0,title:phase==='failed'?'充电启动失败':phase==='starting'?'正在确认设备启动':'充电已启动',body:order.failureReason||`${order.stationName||''} · ${order.socketCode||''}`,path:`/pages/session/index?id=${encodeURIComponent(order.id)}`});
  }
  if(order.status==='ended')result.push({id:`order:${order.id}:ended`,time:order.endedAt||0,title:'充电已结束',body:(order.endReason||'充电已完成')+(order.payment==='unpaid'?'，请查看账单并完成模拟支付':''),path:`/pages/session/index?id=${encodeURIComponent(order.id)}`});
  if(order.payment==='paid')result.push({id:`order:${order.id}:paid`,time:order.paidAt||order.endedAt||0,title:'模拟支付完成',body:'账单已更新，本次未发生真实扣款。',path:`/pages/session/index?id=${encodeURIComponent(order.id)}`});
 }
 for(const report of reports){
  if(['processing','resolved'].includes(report.status))result.push({id:`repair:${report.id}:${report.status}:${report.updatedAt||0}`,time:report.updatedAt||report.createdAt||0,title:report.status==='resolved'?'报修已有处理结果':'报修正在处理中',body:report.resolution||'工作人员已开始处理，请查看进度。',path:'/pages/report/index?history=1'});
 }
 return result.sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
}
export function filterStations(stations,{query='',scene='',savedOnly=false,recentOnly=false,favorites=[],recent=[],sort='default'}={}){
 const found=stations.filter(s=>(!query||(s.name+' '+s.address).includes(query.trim()))&&(!scene||s.scene===scene)&&(!savedOnly||favorites.includes(s.id))&&(!recentOnly||recent.includes(s.id)));
 if(sort==='free')found.sort((a,b)=>availableCount(b)-availableCount(a));
 if(recentOnly)found.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
 return found;
}
