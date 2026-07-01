use database::models::account_transfer::TransactionTransferMeta;
use database::models::financial_account::FinancialAccountSummary;
use database::models::transaction::Transaction;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct TransactionListItem {
    #[serde(flatten)]
    pub transaction: Transaction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_category_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_category_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub financial_account: Option<FinancialAccountSummary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer_pair_id: Option<i64>,
    pub is_transfer_leg: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer_leg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer_pair_status: Option<String>,
}

#[derive(Serialize)]
pub struct PaginatedTransactionList {
    pub items: Vec<TransactionListItem>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

pub fn total_pages(total: i64, per_page: i64) -> i64 {
    if total <= 0 {
        return 0;
    }
    (total + per_page - 1) / per_page
}

pub fn bare_list_items(transactions: Vec<Transaction>) -> Vec<TransactionListItem> {
    transactions
        .into_iter()
        .map(|transaction| TransactionListItem {
            transaction,
            suggested_category_id: None,
            suggested_category_name: None,
            financial_account: None,
            transfer_pair_id: None,
            is_transfer_leg: false,
            transfer_leg: None,
            transfer_pair_status: None,
        })
        .collect()
}

pub fn apply_transfer_meta(
    items: &mut [TransactionListItem],
    meta: &HashMap<i64, TransactionTransferMeta>,
) {
    for item in items {
        let Some(transfer) = meta.get(&item.transaction.id) else {
            continue;
        };
        item.transfer_pair_id = Some(transfer.pair_id);
        item.is_transfer_leg = true;
        item.transfer_leg = Some(transfer.leg.clone());
        item.transfer_pair_status = Some(transfer.status.clone());
    }
}
