<template>
  <view>
    <mp-html :content="html" />
  </view>
</template>
<script>
import mpHtml from "mp-html/dist/uni-app/components/mp-html/mp-html";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/scss/atom-one-dark.scss";

export default {
  components: {
    mpHtml,
  },
  data() {
    return {
      html: "<div>Hello World!</div>",
      markdown: " ```javascript        function() {        console.log(123)      }       ``` ",
    };
  },
  mounted() {
    this.initHighLight();

    this.html = marked(this.markdown).replace(/<pre>/g, "<pre class='hljs'>");
  },
  methods: {
    initHighLight() {
      hljs.configure({
        useBR: true,
        tabReplace: " ",
      });
      marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        highlight: function (code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(lang, code, true).value;
          } else {
            return hljs.highlightAuto(code).value;
          }
        },
      });
    },
  },
};
</script>