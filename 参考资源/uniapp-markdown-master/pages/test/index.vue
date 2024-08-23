<template>
  <view>
    <textarea ref="myTextarea" v-model="text" @input="handleInput" @blur="handleBlur" @focus="handleFocus"
      placeholder="输入内容" style="width: 100%; height: 200px;"></textarea>
    <button @click="increaseIndent">增加缩进</button>
    <button @click="decreaseIndent">减少缩进</button>
    <view>{{ lineContent }}</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      text: '',              // 存储textarea内容
      cursorPosition: 0,    // 光标位置
      start: 0,             // 光标开始位置
      end: 0                // 光标结束位置
    };
  },
  methods: {
    handleInput(event) {
      this.text = event.target.value;
    },
    handleBlur(event) {
      this.cursorPosition = event.target.selectionStart;
    },
    handleFocus(event) {
      this.start = event.target.selectionStart;
      this.end = event.target.selectionEnd;
    },
    getLineIndex() {
      return this.text.substring(0, this.cursorPosition).split('\n').length - 1;
    },
    adjustIndent(indentSize) {
      const lines = this.text.split('\n');
      const lineIndex = this.getLineIndex();

      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = `${' '.repeat(indentSize)}${lines[lineIndex]}`;
        this.text = lines.join('\n');
        this.$nextTick(() => {
          const textarea = this.$refs.myTextarea;
          textarea.selectionStart = this.start;
          textarea.selectionEnd = this.end;
        });
      }
    },
    increaseIndent() {
      this.adjustIndent(2); // 增加缩进，例如2个空格
    },
    decreaseIndent() {
      const lines = this.text.split('\n');
      const lineIndex = this.getLineIndex();

      if (lineIndex >= 0 && lineIndex < lines.length) {
        if (lines[lineIndex].startsWith('  ')) {
          lines[lineIndex] = lines[lineIndex].substring(2);
        }
        this.text = lines.join('\n');
        this.$nextTick(() => {
          const textarea = this.$refs.myTextarea;
          textarea.selectionStart = this.start;
          textarea.selectionEnd = this.end;
        });
      }
    }
  }
};
</script>
