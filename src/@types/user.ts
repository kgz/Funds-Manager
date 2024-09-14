export type TUser = {
    id: number
    username: string
    email: string
    password: string
    location: string
    created_at: string
    enabled: boolean
}

export interface CreateRespError {
	username?: string
	email?: string
	password?: string
	other?: string
}
