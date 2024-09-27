const getters = {
  openid: state => state.user.openid,
  userData: state => state.user.userData,
  AddUser: state => state.user.AddUser,
  summarizeId: state => state.summary.summarizeId,
  summarizeStatus: state => state.summary.summarizeStatus
}
export default getters
