<template>
	<view class="content">
		<md-editor :textareaDataProp="textareaData" :textareaHtmlProp="textareaHtml" />
	</view>
</template>

<script>
import mdEditor from '../../components/md-editor.vue'
export default {
	components: {
		mdEditor
	},
	data() {
		return {
			textareaData: "",
			textareaHtml: "",
		}
	},
}
</script>
<style>
.content {
	height: 100vh;
}
</style>
