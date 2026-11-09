export class ApiError extends Error {
  constructor(message, status=0, kind='http') {
    super(message); this.name='ApiError'; this.status=status; this.kind=kind;
  }
}

// The transport is uni.request in both H5 and WeChat. Tests inject callbacks.
export function createApiClient({request,baseUrl,getToken=()=>null,onUnauthorized=()=>{}}) {
  const base=baseUrl.replace(/\/$/,'');
  function send(path,{method='GET',data,authenticated=true}={}) {
    const token=authenticated?getToken():null;
    if(authenticated&&!token) return Promise.reject(new ApiError('请先登录',401,'auth'));
    return new Promise((resolve,reject)=>{
      request({url:base+path,method,data,timeout:12000,
        header:{'content-type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        success:res=>{
          const body=res.data;
          if(res.statusCode===401&&authenticated) { onUnauthorized(token); return reject(new ApiError('登录已失效，请重新登录',401,'auth')); }
          if(res.statusCode<200||res.statusCode>=300||!body||![200,201].includes(body.code)) {
            return reject(new ApiError(typeof body?.message==='string'?body.message:'服务暂时不可用，请稍后重试',res.statusCode));
          }
          if(!Object.prototype.hasOwnProperty.call(body,'data')) return reject(new ApiError('服务返回的数据格式不正确',res.statusCode,'contract'));
          resolve(body.data);
        },
        fail:()=>reject(new ApiError(method==='GET'?'网络连接失败，请检查网络后重试':'请求结果尚未确认，请刷新后核对',0,'network'))
      });
    });
  }
  const id=value=>encodeURIComponent(String(value));
  return {
    login:data=>send('/auth/login',{method:'POST',data,authenticated:false}),
    register:data=>send('/auth/register',{method:'POST',data,authenticated:false}),
    me:()=>send('/auth/me'),
    stations:()=>send('/stations'), chargers:()=>send('/chargers'), connectors:()=>send('/connectors'),
    prices:stationId=>send('/price-periods?stationId='+id(stationId)),
    orders:()=>send('/customer/orders'), order:orderId=>send('/customer/orders/'+id(orderId)),
    start:data=>send('/customer/orders/start',{method:'POST',data}),
    reports:()=>send('/customer/repairs'),
    report:data=>send('/customer/repairs',{method:'POST',data}),
    stop:orderId=>send('/customer/orders/'+id(orderId)+'/stop',{method:'POST'}),
    pay:orderId=>send('/customer/orders/'+id(orderId)+'/mock-payment',{method:'POST',data:{method:'WECHAT'}})
  };
}
