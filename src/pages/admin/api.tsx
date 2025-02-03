import { RedocStandalone } from 'redoc'

const APIDocs = () => {
	return (
		<div
			style={
				{
					// position: 'absolute',
				}
			}
		>
			<RedocStandalone specUrl="/chaos/api/openapi.json" />
		</div>
	)
}

export default APIDocs
