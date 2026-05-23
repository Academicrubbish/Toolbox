# 小程序开发避坑指南

## 1. `:style` 必须使用字符串格式

### 问题描述

uni-app 编译到微信小程序时，`:style` 绑定**不支持对象格式**，也不支持数组包裹对象的格式。对象会被 `.toString()` 转为 `[object Object]`，导致样式完全不生效。

### 错误写法

```html
<!-- 对象字面量 -->
<view :style="{ background: color, height: h + 'px' }"></view>

<!-- 数组包裹对象 -->
<view :style="[{ height: h + 'px' }]"></view>

<!-- 计算属性返回对象 -->
<view :style="myStyleObj"></view>
```

```js
// 计算属性返回对象 ❌
computed: {
  myStyleObj() {
    return { background: '#fff', color: '#000' }
  }
}
```

### 正确写法

```html
<!-- 字符串拼接 -->
<view :style="'background:' + color + ';height:' + h + 'px'"></view>

<!-- 计算属性返回字符串 -->
<view :style="myStyle"></view>
```

```js
// 计算属性返回字符串 ✅
computed: {
  myStyle() {
    return `background:${this.color};height:${this.h}px`
  }
}
```

### 检查方法

在微信开发者工具的调试器中，如果看到元素属性为 `style="[object Object]"`，说明使用了对象格式，需要改为字符串。

---

## 2. 其他小程序注意事项（持续补充）

- `Object.values()` 在部分低版本小程序基础库不支持，使用 `Object.keys().map(key => obj[key])` 替代
- `<input>` 的 `v-model` 在特定场景下可能将值设为 `undefined`，建议用 `:value` + `@input` 手动处理
- 小程序不支持 `backdrop-filter` 的低端机型需要降级方案（纯色背景兜底）
- `scoped` 样式在小程序中通过属性选择器实现，优先级可能高于 inline style，必要时使用字符串格式 `:style` 确保覆盖
