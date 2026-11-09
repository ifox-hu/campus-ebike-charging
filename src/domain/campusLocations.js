// GCJ-02 campus demonstration planning, not installed charging facilities.
// Anchor POIs are from the same AMap provider used by DashboardStationMap:
// https://www.amap.com/place/B017904HJ3 (campus gym)
// https://www.amap.com/place/B017900L0H (west campus)
// https://www.amap.com/place/B0HRVXFSZ1 (east-campus tennis courts)
// The two central-campus planning points are approximate, visually reviewed
// within campus on the provider map; do not claim a surveyed parking location.
export const CAMPUS_DEMO_LOCATIONS=[
 {id:'ST01',name:'中区教学区示例站',address:'南阳师范学院中区 · 教学区演示规划点',lat:32.9761,lng:112.4893},
 {id:'ST02',name:'中区生活区示例站',address:'南阳师范学院中区 · 学生生活区演示规划点',lat:32.9765,lng:112.4877},
 {id:'ST03',name:'中区体育馆示例站',address:'南阳师范学院中区 · 体育馆地标参考点',lat:32.978854,lng:112.489532},
 {id:'ST04',name:'西区校园示例站',address:'南阳师范学院西区 · 校园地标参考点',lat:32.975255,lng:112.482660},
 {id:'ST05',name:'东区运动区示例站',address:'南阳师范学院东区 · 网球场地标参考点',lat:32.977236,lng:112.493175}
].map(s=>({...s,scene:'校园',coordinateType:'GCJ02',campusLocationRevision:1,
 note:'南阳师范学院校内演示规划点；GCJ-02 高德坐标。参考校园地标，不代表实际充电设施或实测安装位置。'}))

export const LEGACY_DEMO_LOCATIONS=[
 {id:'ST01',name:'教学楼东侧示例站',lat:32.9912,lng:112.5231},
 {id:'ST02',name:'食堂北侧示例站',lat:32.9931,lng:112.5252},
 {id:'ST03',name:'体育馆示例站',lat:32.9896,lng:112.5208},
 {id:'ST04',name:'园区通勤示例站',lat:32.9875,lng:112.5294},
 {id:'ST05',name:'住宅小区示例站',lat:32.9953,lng:112.5311}
]
