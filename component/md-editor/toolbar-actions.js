/**
 * Markdown 编辑器 - 工具栏操作配置
 * 使用 dispatch table 模式替代 switch/case
 */
import { echartsOptions, getChartTemplate } from "./chart-templates.js";

const headers = ["#", "##", "###", "####", "#####", "######"];

/**
 * 工具栏操作映射表
 * key: 操作类型
 * value: 处理函数 (context, appendText, adjustIndentation) => void
 */
export const toolbarActions = {
  bold(ctx, appendText) {
    appendText("**粗体文字** ");
  },
  italic(ctx, appendText) {
    appendText("*斜体* ");
  },
  header(ctx, appendText) {
    uni.showActionSheet({
      itemList: ["标题1", "标题2", "标题3", "标题4", "标题5", "标题6"],
      success: (res) =>
        appendText(`\n${headers[res.tapIndex]} 标题${res.tapIndex + 1}\r`),
    });
  },
  underline(ctx, appendText) {
    appendText("++下划线++ ");
  },
  strike(ctx, appendText) {
    appendText("~~删除线~~ ");
  },
  sup(ctx, appendText) {
    appendText("^上角标^ ");
  },
  sub(ctx, appendText) {
    appendText("~下角标~ ");
  },
  link(ctx, appendText) {
    appendText("[在此输入网址描述](在此输入网址) ");
  },
  img(ctx, appendText) {
    uni.chooseImage({
      count: 1,
      success: (res) => {
        appendText(`<img src="${res.tempFilePaths[0]}" style="zoom:100%;" />`);
      },
    });
  },
  code(ctx, appendText) {
    appendText("\n``` 代码块 \n\n```\n");
  },
  table(ctx, appendText) {
    appendText("\n|列1|列2|列3|\n|-|-|-|\n|单元格1|单元格2|单元格3|\n");
  },
  inlineCode(ctx, appendText) {
    appendText("`行内代码块`");
  },
  taskList(ctx, appendText) {
    appendText("\n- [ ] 任务列表");
  },
  quote(ctx, appendText) {
    appendText("\n> 引用内容");
  },
  latex(ctx, appendText) {
    uni.showActionSheet({
      itemList: ["行内公式", "块级公式"],
      success: (res) => {
        if (res.tapIndex === 0) {
          appendText("$E = mc^2$ ");
        } else {
          appendText(
            "\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n",
          );
        }
      },
    });
  },
  yuml(ctx, appendText) {
    uni.showActionSheet({
      itemList: ["类图", "活动图", "用例图"],
      success: (res) => {
        if (res.tapIndex === 0) {
          appendText("\n```yuml\n[Customer]<>-orders*>[Order]\n```\n");
        } else if (res.tapIndex === 1) {
          appendText("\n```yuml\n[Start]->[End]\n```\n");
        } else {
          appendText("\n```yuml\n[User]-(Login)\n```\n");
        }
      },
    });
  },
  echarts(ctx, appendText) {
    uni.showActionSheet({
      itemList: echartsOptions,
      success: (res) => {
        appendText(getChartTemplate(res.tapIndex));
      },
    });
  },
  mermaid(ctx, appendText) {
    uni.showActionSheet({
      itemList: ['流程图', '时序图', '甘特图', '类图'],
      success: (res) => {
        const templates = [
          '\n```mermaid\ngraph LR\n    A[开始] --> B{条件判断}\n    B -->|是| C[执行操作]\n    B -->|否| D[结束]\n    C --> D\n```\n',
          '\n```mermaid\nsequenceDiagram\n    participant A as 用户\n    participant B as 系统\n    A->>B: 发起请求\n    B-->>A: 返回结果\n```\n',
          '\n```mermaid\ngantt\n    title 项目计划\n    dateFormat YYYY-MM-DD\n    section 阶段一\n    任务A :a1, 2024-01-01, 7d\n    任务B :after a1, 5d\n```\n',
          '\n```mermaid\nclassDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +fetch()\n    }\n    Animal <|-- Dog\n```\n',
        ];
        appendText(templates[res.tapIndex]);
      },
    });
  },
  inIndentation(ctx, appendText, adjustIndentation) {
    adjustIndentation(true);
  },
  reIndentation(ctx, appendText, adjustIndentation) {
    adjustIndentation(false);
  },
  dividingLine(ctx, appendText) {
    appendText("\n------");
  },
  ul(ctx, appendText) {
    appendText("\n- 无序列表1");
  },
  ol(ctx, appendText) {
    appendText("\n1. 有序列表");
  },
  clear(ctx) {
    uni.showModal({
      title: "提示",
      content: "确定清空?",
      success: (res) => {
        if (res.confirm) {
          ctx.textareaData = "";
        }
      },
    });
  },
  toggle(ctx) {
    if (ctx.status) {
      ctx.updateTextareaContent();
    } else {
      ctx.loading = false;
      if (ctx.loadingTimer) {
        clearTimeout(ctx.loadingTimer);
        ctx.loadingTimer = null;
      }
    }
    ctx.status = !ctx.status;
  },
  upload(ctx) {
    ctx.uploadMdFile();
  },
};

/**
 * 执行工具栏操作
 * @param {string} type - 操作类型
 * @param {object} ctx - 组件实例 (this)
 */
export function executeToolbarAction(type, ctx) {
  const action = toolbarActions[type];
  if (!action) return;

  const appendText = (text) => {
    ctx.textareaData += text;
  };
  const adjustIndentation = (increase) => {
    const lines = ctx.textareaData.split("\n");
    if (lines.length > 0) {
      const lastLineIndex = lines.length - 1;
      if (increase) {
        lines[lastLineIndex] = "  " + lines[lastLineIndex];
      } else {
        lines[lastLineIndex] = lines[lastLineIndex].replace(/^ {2}/, "");
      }
      ctx.textareaData = lines.join("\n");
    }
  };

  action(ctx, appendText, adjustIndentation);
}
