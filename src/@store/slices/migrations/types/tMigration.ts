import { z } from 'zod'

export const ZMigration = z.object({
	name: z.string(),
	key: z.string(),
	description: z.string(),
	ran: z.boolean(),
	origional_commit: z.string(),
})

export type TMigration = z.infer<typeof ZMigration>
export const ZMigrations = z.array(ZMigration)
export type TMigrations = z.infer<typeof ZMigrations>
