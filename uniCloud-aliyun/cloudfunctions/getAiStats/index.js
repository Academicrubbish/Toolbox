'use strict'

/**
 * AI 资源消耗统计（管理端用）
 * URL 化云函数，供 admin.html 调用。
 * 鉴权：query 参数 key 必须等于环境变量 ADMIN_KEY。
 */

const ADMIN_KEY = process.env.ADMIN_KEY

// 各模型公开定价（单位：人民币元 / 百万 Token）
// 阶梯价格按单次请求的输入 Token 数选择；费用仍为估算值，以供应商账单为准。
const PRICING_UPDATED_AT = '2026-08-02'
const PRICING = {
  'glm-5': {
    provider: '智谱AI', type: 'token', official: true,
    source: 'https://bigmodel.cn/pricing',
    tiers: [
      { maxInputTokens: 31999, label: '输入 < 32K', input: 4, output: 18 },
      { maxInputTokens: null, label: '输入 ≥ 32K', input: 6, output: 22 }
    ]
  },
  'qwen3.6-flash': {
    provider: '阿里云百炼', type: 'token', official: true,
    source: 'https://help.aliyun.com/zh/model-studio/qwen3-6-flash',
    tiers: [
      { maxInputTokens: 256000, label: '输入 ≤ 256K', input: 1.2, output: 7.2 },
      { maxInputTokens: null, label: '256K < 输入 ≤ 1M', input: 4.8, output: 28.8 }
    ]
  },
  // 下列模型不是本次价格核对范围，保留原有估值以兼容历史调用记录。
  'glm-4.6':     { provider: '智谱AI', input: 2, output: 8, type: 'token', official: false },
  'glm-4-flash': { provider: '智谱AI', input: 0.1, output: 0.1, type: 'token', official: false },
  'glm-ocr':     { provider: '智谱AI', input: 0.2, output: 0.2, type: 'token', perCall: 0.01, official: false },
  'reader':      { provider: '智谱AI', perCall: 0.01, type: 'call', official: false }
}

const BJ_OFFSET = 8 * 3600 * 1000
const ONE_DAY = 86400000

function buildResponse(data, status) {
  return {
    mpserverlessComposedResponse: true,
    statusCode: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(data)
  }
}

function round2(n) {
  return Math.round((n || 0) * 100) / 100
}

function roundCost(n) {
  return Math.round((n || 0) * 1000000) / 1000000
}

/** 按 day(北京时间) 格式化为 YYYY-MM-DD，用作聚合 key */
function dayLabel(t) {
  const d = new Date(t + BJ_OFFSET)
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0')
}

/** 根据单次请求输入量选择计费阶梯 */
function resolveTokenRate(pricing, inputTokens) {
  if (!pricing.tiers || !pricing.tiers.length) return pricing
  return pricing.tiers.find(tier => tier.maxInputTokens === null || inputTokens <= tier.maxInputTokens) || pricing.tiers[pricing.tiers.length - 1]
}

/** 单条调用预估费用（元） */
function calcCost(log) {
  const p = PRICING[log.model]
  if (!p) return 0
  if (p.type === 'call') return p.perCall || 0
  const requestInputs = Array.isArray(log.request_prompt_tokens) ? log.request_prompt_tokens : []
  const requestOutputs = Array.isArray(log.request_completion_tokens) ? log.request_completion_tokens : []
  if (requestInputs.length) {
    return requestInputs.reduce((total, inputTokens, index) => {
      const inT = Number(inputTokens) || 0
      const outT = Number(requestOutputs[index]) || 0
      const rate = resolveTokenRate(p, inT)
      return total + (inT * rate.input + outT * rate.output) / 1e6
    }, 0)
  }
  const inT = Number(log.prompt_tokens) || 0
  const outT = Number(log.completion_tokens) || 0
  const rate = resolveTokenRate(p, inT)
  if (inT || outT) {
    return (inT * rate.input + outT * rate.output) / 1e6
  }
  if (log.total_tokens && rate.input != null) {
    return log.total_tokens * ((rate.input + rate.output) / 2) / 1e6
  }
  return p.perCall || 0
}

function pricingForClient() {
  return {
    updatedAt: PRICING_UPDATED_AT,
    currency: 'CNY',
    unit: '元 / 百万 Token',
    models: Object.keys(PRICING).map(model => {
      const p = PRICING[model]
      const tiers = p.tiers || (p.type === 'token'
        ? [{ maxInputTokens: null, label: '全部输入长度', input: p.input, output: p.output }]
        : [])
      return {
        model,
        provider: p.provider,
        type: p.type,
        perCall: p.perCall || null,
        official: p.official,
        source: p.source || '',
        tiers
      }
    })
  }
}

/** 兼容云端/本地返回结构 */
function pickData(res) {
  if (!res) return []
  if (res.result && res.result.data) return res.result.data
  if (res.data) return res.data
  return []
}

/** 分页拉取符合条件的全部记录（只取统计所需字段） */
async function fetchAll(db, where) {
  const PAGE = 500
  const MAX = 50000
  let all = []
  let skip = 0
  while (skip < MAX) {
    const res = await db.collection('ai_call_logs')
      .where(where)
      .field({
        function: true, model: true, openid: true,
        prompt_tokens: true, completion_tokens: true, total_tokens: true,
        request_prompt_tokens: true, request_completion_tokens: true,
        status: true, create_time: true, error_msg: true
      })
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(PAGE)
      .get()
    const d = pickData(res)
    all = all.concat(d)
    if (d.length < PAGE) break
    skip += PAGE
  }
  return all
}

/** 内存多维聚合 */
function aggregateStats(logs, now, selectedDays) {
  const todayStart = Math.floor((now + BJ_OFFSET) / ONE_DAY) * ONE_DAY - BJ_OFFSET
  const d7 = now - 7 * ONE_DAY
  const d30 = now - 30 * ONE_DAY
  const selectedStart = now - selectedDays * ONE_DAY

  const mkBuckets = () => ({
    today: { tokens: 0, inputTokens: 0, outputTokens: 0, calls: 0, users: {}, success: 0, cost: 0 },
    d7: { tokens: 0, inputTokens: 0, outputTokens: 0, calls: 0, users: {}, success: 0, cost: 0 },
    d30: { tokens: 0, inputTokens: 0, outputTokens: 0, calls: 0, users: {}, success: 0, cost: 0 },
    all: { tokens: 0, inputTokens: 0, outputTokens: 0, calls: 0, users: {}, success: 0, cost: 0 }
  })
  const overview = mkBuckets()

  const trendMap = {}
  const userMap = {}
  const funcMap = {}
  const modelMap = {}

  logs.forEach(log => {
    const t = log.create_time || 0
    const inputTokens = Number(log.prompt_tokens) || 0
    const outputTokens = Number(log.completion_tokens) || 0
    const tokens = Number(log.total_tokens) || inputTokens + outputTokens
    const success = log.status === 'success' ? 1 : 0
    const cost = calcCost(log)

    // overview 归类（按时间窗口累加）
    const buckets = []
    if (t >= todayStart) buckets.push('today')
    if (t >= d7) buckets.push('d7')
    if (t >= d30) buckets.push('d30')
    if (t >= selectedStart) buckets.push('all')
    buckets.forEach(b => {
      const o = overview[b]
      o.tokens += tokens
      o.inputTokens += inputTokens
      o.outputTokens += outputTokens
      o.calls += 1
      o.success += success
      o.cost += cost
      if (log.openid) o.users[log.openid] = 1
    })

    // 趋势和排行仅统计用户当前选择的时间范围。
    if (t < selectedStart) return

    // 趋势（按天）
    const dk = dayLabel(t)
    if (!trendMap[dk]) trendMap[dk] = { tokens: 0, calls: 0, cost: 0 }
    trendMap[dk].tokens += tokens
    trendMap[dk].calls += 1
    trendMap[dk].cost += cost

    // 按用户
    const oid = log.openid || '(未知)'
    if (!userMap[oid]) userMap[oid] = { openid: oid, userName: '', tokens: 0, calls: 0, cost: 0 }
    userMap[oid].tokens += tokens
    userMap[oid].calls += 1
    userMap[oid].cost += cost

    // 按功能
    const fn = log.function || '(未知)'
    if (!funcMap[fn]) funcMap[fn] = { name: fn, tokens: 0, calls: 0, cost: 0 }
    funcMap[fn].tokens += tokens
    funcMap[fn].calls += 1
    funcMap[fn].cost += cost

    // 按模型
    const m = log.model || '(未知)'
    if (!modelMap[m]) modelMap[m] = { name: m, tokens: 0, calls: 0, cost: 0 }
    modelMap[m].tokens += tokens
    modelMap[m].calls += 1
    modelMap[m].cost += cost
  })

  // overview 收尾
  const overviewOut = {}
  Object.keys(overview).forEach(b => {
    const o = overview[b]
    overviewOut[b] = {
      tokens: o.tokens,
      inputTokens: o.inputTokens,
      outputTokens: o.outputTokens,
      calls: o.calls,
      users: Object.keys(o.users).length,
      successRate: o.calls ? round2((o.success / o.calls) * 100) : 0,
      cost: roundCost(o.cost)
    }
  })

  const trend = Object.keys(trendMap).sort().map(k => ({
    date: k, tokens: trendMap[k].tokens, calls: trendMap[k].calls, cost: roundCost(trendMap[k].cost)
  }))

  const byUser = Object.values(userMap).map(u => ({ ...u, cost: roundCost(u.cost) }))
    .sort((a, b) => b.cost - a.cost)
  const byFunction = Object.values(funcMap).map(x => ({ ...x, cost: roundCost(x.cost) }))
    .sort((a, b) => b.cost - a.cost)
  const byModel = Object.values(modelMap).map(x => ({ ...x, cost: roundCost(x.cost) }))
    .sort((a, b) => b.cost - a.cost)

  // 最近明细（logs 已按时间倒序）
  const recent = logs.filter(l => (l.create_time || 0) >= selectedStart).slice(0, 50).map(l => ({
    time: l.create_time,
    function: l.function,
    model: l.model,
    openid: l.openid,
    inputTokens: Number(l.prompt_tokens) || 0,
    outputTokens: Number(l.completion_tokens) || 0,
    tokens: Number(l.total_tokens) || (Number(l.prompt_tokens) || 0) + (Number(l.completion_tokens) || 0),
    status: l.status,
    error_msg: l.error_msg,
    cost: roundCost(calcCost(l))
  }))

  return { overview: overviewOut, trend, byUser, byFunction, byModel, recent }
}

exports.main = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse({ code: 0 })
  }

  // 鉴权
  const q = event.queryStringParameters || {}
  if (!ADMIN_KEY) {
    return buildResponse({ code: -1, message: '统计服务缺少 ADMIN_KEY 环境变量' }, 503)
  }
  if (!q.key || q.key !== ADMIN_KEY) {
    return buildResponse({ code: -1, message: '无权访问，请检查管理密钥' }, 403)
  }

  try {
    const days = Math.min(Math.max(parseInt(q.days) || 30, 1), 180)
    const db = uniCloud.database()
    const dbCmd = db.command
    const now = Date.now()
    // 固定总览需要始终具备近 30 天数据；趋势和排行仍按用户选择范围聚合。
    const fetchDays = Math.max(days, 30)
    const since = now - fetchDays * ONE_DAY

    // 1. 拉取近 N 天全部调用记录，内存聚合
    const logs = await fetchAll(db, { create_time: dbCmd.gte(since) })
    const stats = aggregateStats(logs, now, days)

    // 2. 给用户排行补昵称（Top20 内的）
    const topOpenids = stats.byUser.slice(0, 20).map(u => u.openid).filter(o => o && o !== '(未知)')
    if (topOpenids.length) {
      const uRes = await db.collection('tb_user')
        .where({ _openid: dbCmd.in(topOpenids) })
        .field({ _openid: true, userName: true })
        .limit(50)
        .get()
      const nameMap = {}
      pickData(uRes).forEach(u => { nameMap[u._openid] = u.userName || '' })
      stats.byUser.forEach(u => {
        if (nameMap[u.openid]) u.userName = nameMap[u.openid]
      })
    }

    // 3. 最近告警
    const alertRes = await db.collection('ai_alerts')
      .orderBy('create_time', 'desc')
      .limit(20)
      .get()
    stats.alerts = pickData(alertRes).map(a => ({
      rule: a.rule,
      level: a.level,
      message: a.message,
      openid: a.openid,
      userName: a.user_name,
      create_time: a.create_time
    }))

    stats.days = days
    stats.generatedAt = now
    stats.pricing = pricingForClient()

    return buildResponse({ code: 0, data: stats })
  } catch (err) {
    console.error('[getAiStats] 错误:', err.message)
    return buildResponse({ code: -1, message: '统计失败：' + err.message }, 500)
  }
}
