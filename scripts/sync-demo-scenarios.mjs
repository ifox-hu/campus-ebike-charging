import {writeFileSync} from 'node:fs';
const examples=[
 ['医院','医院职工停车区一号示例站','职工停车棚','HOSPITAL-STAFF',32.9905,112.5020,[12,12]],
 ['医院','医院门诊配套停车区示例站','门诊配套非机动车停车区','HOSPITAL-VISITOR',32.9912,112.5030,[10,12]],
 ['住宅小区','社区东门停车棚示例站','小区东门集中停车棚','COMMUNITY-EAST',32.9870,112.5110,[12,15]],
 ['住宅小区','社区便民服务区示例站','社区服务中心非机动车停车区','COMMUNITY-SERVICE',32.9850,112.5080,[10,12]],
 ['产业园区','产业园员工停车区示例站','园区员工通勤停车棚','INDUSTRIAL-STAFF',32.9970,112.5230,[12]],
 ['产业园区','厂区换班停车区示例站','厂区入口非机动车集中停车区','FACTORY-SHIFT',32.9990,112.5250,[12,12]],
 ['办公区','办公园区通勤示例站','办公楼配套非机动车停车棚','OFFICE-COMMUTE',32.9830,112.5200,[10,10]],
 ['办公区','企事业单位职工示例站','单位职工集中停车充电区','OFFICE-STAFF',32.9810,112.5170,[12,15]],
 ['商业配套','商场员工停车区示例站','商业配套员工非机动车停车棚','RETAIL-STAFF',32.9930,112.5150,[10,12]],
 ['商业配套','商业街商户停车区示例站','商户配套非机动车集中停车区','RETAIL-MERCHANT',32.9950,112.5170,[12]]
];
const sites=examples.map(([scene,name,area,prefix,latitude,longitude,rows],i)=>({id:`SC${String(i+1).padStart(2,'0')}`,adminId:`ST${String(i+7).padStart(2,'0')}`,scene,name,area,prefix,latitude,longitude,rows,address:`${scene}场景 · ${area}（虚构演示位置）`,coordinateType:'GCJ02',note:'虚构演示站点及模拟规划坐标，仅用于列表、地图与充电流程展示；不代表实际医院、小区、园区或已建充电设施。'}));
for(const path of ['frontend/src/domain/scenario-stations.json','uni-app/src/data/scenario-stations.json','backend/charging-service/src/main/resources/scenario-stations.json'])writeFileSync(new URL('../'+path,import.meta.url),JSON.stringify(sites,null,2)+'\n');
