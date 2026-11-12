import sites from './scenario-stations.json' with {type:'json'}
export const EXTRA_DEMO_LOCATIONS=[
 {id:'ST06',name:'南阳理工学院校园充电站（模拟）',scene:'校园',address:'河南省南阳市宛城区长江路80号 · 毕设演示点位',lat:32.967595,lng:112.553209,coordinateType:'GCJ02',layout:[12,12],note:'校园参考位置，仅用于毕设模拟展示，非实测充电设施。'},
 ...sites.map(s=>({id:s.adminId,scenarioSampleId:s.id,name:s.name,scene:s.scene,address:s.address,lat:s.latitude,lng:s.longitude,coordinateType:s.coordinateType,note:s.note,layout:s.rows}))
]
