export const DEFAULT_SERVICE_FEE_PERCENT=10
export function servicePriceFor(electricityPrice,percent=DEFAULT_SERVICE_FEE_PERCENT){
 const price=Number(electricityPrice),ratio=Number(percent)
 if(electricityPrice===''||electricityPrice==null||!Number.isFinite(price)||price<0)throw Error('电价必须为非负数')
 if(percent===''||percent==null||!Number.isFinite(ratio)||ratio<0||ratio>100)throw Error('服务费比例须为0—100之间的百分数')
 return Number((price*ratio/100).toFixed(4))
}
export function servicePercentOf(electricityPrice,servicePrice){
 if(servicePrice==null)return DEFAULT_SERVICE_FEE_PERCENT
 return Number(electricityPrice)>0?Number((Number(servicePrice)/Number(electricityPrice)*100).toFixed(6)):0
}
