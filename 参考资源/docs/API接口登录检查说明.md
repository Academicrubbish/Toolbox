# API接口登录检查说明

## 需要登录的接口列表

### 1. 记录相关接口 (api/record.js)

#### 需要登录的接口：
- ✅ `getRecordList(data)` - 查询记录列表（使用 createBy: user.openid）
- ✅ `addRecord(data)` - 添加记录（需要传 createBy）
- ✅ `updateRecord(id, data)` - 更新记录（需要验证权限）
- ✅ `delRecord(id)` - 删除记录（需要验证权限）

#### 不需要登录的接口：
- `getRecord(id)` - 查询记录详情（可公开访问）

---

### 2. 总结相关接口 (api/summarize.js)

#### 需要登录的接口：
- ✅ `addSummarize(data)` - 添加总结（需要传 openid）
- ✅ `updateSummarize(id, data)` - 更新总结（需要验证权限）
- ✅ `delSummarize(id)` - 删除总结（需要验证权限）

#### 不需要登录的接口：
- `getSummarize(id)` - 查询总结详情（可公开访问）
- `summarizeRecordInfoById(id)` - 根据recordId查询（可公开访问）

---

### 3. 标签分类相关接口 (api/dictCategory.js)

#### 需要登录的接口：
- ✅ `getDictCategoryList()` - 查询标签列表（使用 openid 过滤）
- ✅ `addDictCategory(data)` - 添加标签（需要传 createBy）
- ✅ `updateDictCategory(id, data)` - 更新标签（需要验证权限）
- ✅ `delDictCategory(id)` - 删除标签（需要验证权限）

#### 不需要登录的接口：
- `getDictCategory(id)` - 查询标签详情（可公开访问）

---

### 4. 字典相关接口 (api/dict.js)

#### 需要登录的接口：
- ✅ `getDictList()` - 查询字典列表（使用 user.openid 过滤）
- ✅ `getDictTopList()` - 查询前三个标签（使用 user.openid 过滤）
- ✅ `addDict(data)` - 添加字典（需要传 createBy）
- ✅ `updateDict(id, data)` - 更新字典（需要验证权限）
- ✅ `delDict(id)` - 删除字典（需要验证权限）

#### 不需要登录的接口：
- `getDict(id)` - 查询字典详情（可公开访问）

---

## 实现方式

所有需要登录的接口都使用 `withAuth` 函数包装，在调用前自动检查登录状态。
如果未登录，会自动弹出登录弹窗，登录成功后再执行原请求。

