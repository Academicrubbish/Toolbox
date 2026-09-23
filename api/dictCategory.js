import store from '@/store'
import { withAuth } from '@/utils/api-auth.js'
import { noteRequest } from '@/api/noteService.js'

/** 获取标签列表（含公共示例标签） */
export const getDictCategoryList = () => noteRequest('listCategories')
/** 获取标签详情 */
export const getDictCategory = id => noteRequest('getCategory', { id })
/** 新增标签 */
export const addDictCategory = withAuth(value => noteRequest('addCategory', { value }), store)
/** 更新标签 */
export const updateDictCategory = withAuth((id, value) => noteRequest('updateCategory', { id, value }), store)
/** 删除标签 */
export const delDictCategory = withAuth(id => noteRequest('deleteCategory', { id }), store)
