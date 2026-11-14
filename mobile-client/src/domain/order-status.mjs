export const isCurrentOrder=order=>['starting','charging'].includes(order.status);
export function orderStatusText(order) {
  if(order.status==='starting')return '启动中';
  if(order.status==='charging')return '充电中';
  if(order.status==='failed')return '启动失败';
  if(order.status!=='ended')return '状态待确认';
  return ({unpaid:'待支付',paid:'已完成',free:'无需支付'})[order.payment]||'支付状态待确认';
}
export const matchesOrderFilter=(order,filter)=>filter==='all'||
  (filter==='charging'&&isCurrentOrder(order))||
  (filter==='unpaid'&&order.status==='ended'&&order.payment==='unpaid')||
  (filter==='ended'&&order.status==='ended'&&['paid','free'].includes(order.payment))||
  (filter==='failed'&&order.status==='failed');
