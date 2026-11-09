> 历史阶段记录：当前已按毕设需求扩展业务页面，现行范围见 requirements-adaptation.md，当前验证见 graduation-verification.md。

# 实现计划

- [x] 提取文章原始截图，记录页面和尺寸。
- [x] 建立独立 Vue 3 工程及与截图一致的公共布局。
- [x] 实现统计首页图表、卡片与本地交互。
- [x] 核对页面范围：指定风格的完整图仅统计首页，其他业务列表无完整截图，本轮明确标记入口未实现。
- [x] 运行构建，浏览器逐项核对并修正，保存实测截图。

文件边界：src/App.vue 负责导航和页面装配；src/style.css 负责视觉；src/components/ChartPanel.vue 负责图表生命周期；src/data.js 负责独立演示数据；统计表包含在 DashboardPage.vue；未增加无原图依据的列表页。原图仅用于 reference 目录的开发对照，不作为产品背景。
