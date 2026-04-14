# 代码风格规则

## 通用
- 使用 `const`/`let`，禁止 `var`
- 变量命名使用 camelCase，常量使用 UPPER_SNAKE_CASE
- 函数/方法不超过 80 行，超过则拆分
- 单个 Vue 文件不超过 500 行，超过则提取子组件或 mixin
- 所有导出函数必须有 JSDoc 注释

## Vue 组件
- 组件结构顺序：`template` → `script` → `style`
- `data()` 中属性按功能分组，添加注释
- `methods` 按功能分组，相关方法放一起
- `computed` 用于派生状态，不产生副作用
- `watch` 用于响应数据变化执行副作用
- 组件 props 必须定义类型和默认值
- 组件事件使用 kebab-case（`@card-tap`、`@more-click`）

## API 层
- 每个数据库集合对应一个文件（`api/<collection>.js`）
- 使用 `getRequest()` 延迟初始化数据库连接
- 需要登录的 API 使用 `withAuth()` 包装
- 导出命名使用动词开头：`getRecordList`、`addRecord`、`delRecord`、`searchRecord`

## 样式
- 使用 `rpx` 单位
- 公共样式放 `App.vue` 的 `<style>` 中
- 组件样式使用 `scoped`
- 使用 ColorUI 的工具类（`cuIcon-*`、`text-*`、`margin-*` 等）

## 分包
- 主包仅放首页（`pages/home/index`）
- 新功能页面放在 `subpackage/<feature>/` 下
- 静态资源按功能放在 `static/<feature>/` 下
