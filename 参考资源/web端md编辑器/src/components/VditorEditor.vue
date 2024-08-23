<template>
  <div id="vditor"></div>
</template>

<script>
import Vditor from 'vditor'
import 'vditor/dist/index.css'

export default {
  name: 'VditorEditor',
  data() {
    return {
      contentEditor: null
    }
  },
  mounted() {
    this.initEditor();
  },
  methods: {
    initEditor() {
      this.contentEditor = new Vditor('vditor', {
        height: 360,
        toolbarConfig: {
          pin: true,
        },
        cache: {
          enable: false,
        },
        after: () => {
          this.contentEditor.setValue('hello, Vditor + Vue!')
        },
      });
    }
  }
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
