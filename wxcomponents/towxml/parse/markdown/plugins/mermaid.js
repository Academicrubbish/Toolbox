const mermaidChart = (code) => {
    return `<mermaid value="${encodeURIComponent(code)}"></mermaid>`;
}

module.exports = md => {
    const temp = md.renderer.rules.fence.bind(md.renderer.rules)
    md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx]
        const code = token.content.trim();
        if (token.info === 'mermaid') {
            return mermaidChart(code)
        };
        return temp(tokens, idx, options, env, slf)
    }
};
