const echartsChart = (code) => {
    const encoded = encodeURIComponent(code);
    return `<echarts value="${encoded}"></echarts>`;
}

module.exports = md => {
    const temp = md.renderer.rules.fence.bind(md.renderer.rules)
    md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx]
        const code = token.content.trim();
        if (token.info === 'echarts') {
            return echartsChart(code)
        };
        return temp(tokens, idx, options, env, slf)
    }
};

