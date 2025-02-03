import * as RestApi from '../Api'

const config = new RestApi.Configuration({
	baseOptions: {
		withCredentials: true,
	},
})

export const client = {
	user: new RestApi.UserApi(config),
	channels: new RestApi.ChannelsApi(config),
}
