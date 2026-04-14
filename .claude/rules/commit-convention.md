# Commit 规范

格式：`<type>(<scope>): <subject>`

## type 取值
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构（不改变外部行为）
- `docs`: 文档变更
- `style`: 样式调整（不影响逻辑）
- `chore`: 构建/工具/依赖相关
- `perf`: 性能优化

## scope 取值
- `home`: 首页
- `depart`: 记录模块（表单/详情/学习结果）
- `dict`: 标签管理
- `summarize`: 总结模块
- `auth`: 登录授权
- `ai`: AI 辅导功能
- `changelog`: 更新日志
- `component`: 公共组件
- `api`: 数据接口层
- `utils`: 工具函数

## 示例
```
feat(depart): 新增记录导出功能
fix(auth): 修复游客状态切换时页面未刷新的问题
refactor(component): 提取 record-card 公共组件
```

## 要求
- subject 使用中文，简明扼要，不超过 50 字
- subject 说明"做了什么"，不需要加"的"字结尾
