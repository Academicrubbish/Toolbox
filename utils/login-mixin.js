import { setLoginModalRef, notifyLoginResult } from "@/utils/api-auth.js";

/**
 * 登录处理的 mixin
 * 包含 handleLoginSuccess 和 handleLoginCancel 方法
 * 用于 dictCategory/form.vue、summarize/index.vue 等需要登录弹窗的页面
 */
export default {
	methods: {
		handleLoginSuccess() {
			const oldVersion = this.$store.state.user.authStateVersion;
			this.$store.commit('SET_IS_GUEST', false);
			const newVersion = this.$store.state.user.authStateVersion;
			if (oldVersion === newVersion) {
				this.$store.commit('INCREMENT_AUTH_STATE_VERSION');
			}
			notifyLoginResult(true);
		},
		handleLoginCancel() {
			notifyLoginResult(false);
		},
		setupLoginModal() {
			this.$nextTick(() => {
				if (this.$refs.loginModal) {
					setLoginModalRef(this.$refs.loginModal);
				}
			});
		},
	},
};
