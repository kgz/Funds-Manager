/** auto generated via rust package */ 


import { z } from 'zod'

export enum Rights {
	Admin,
	Users,
	Posts,
	Comments,
	UserManagement,
	RightManagement,
	MigrationManagment,
	ChannelDataManagement,
}
export const Right = z.nativeEnum(Rights)
export type TRight = z.infer<typeof Right>