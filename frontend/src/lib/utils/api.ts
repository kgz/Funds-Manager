import { Configuration, BankingAccountsApi } from "@/client";


const Config = new Configuration(
	{
		basePath: 'https://ob-public.peopleschoice.com.au/cds-au/v1'
	}
);

export const Api = {
	bankingAccountsApi: new BankingAccountsApi(Config)
}