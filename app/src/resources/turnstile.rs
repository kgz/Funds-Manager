use std::{env, net::IpAddr};

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
struct SiteVerifyRequest<'a> {
    secret: &'a str,
    response: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    remoteip: Option<String>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct SiteVerifyResponse {
    pub success: bool,
    // Add more fields as needed, e.g. error-codes, challenge_ts, etc.
}

pub async fn verify_turnstile_token(
    token: &str,
    ip: Option<IpAddr>,
) -> Result<SiteVerifyResponse, reqwest::Error> {
    let client = Client::new();

    let secret_key = env::var("TURNSTILE_KEY")
        .expect("TURNSTILE_KEY must be set");

    let mut _ip = None;

    if let Some(ip_addr) = ip {
        _ip = Some(ip_addr.to_string());
    }

    let payload = SiteVerifyRequest {
        secret: secret_key.as_str(),
        response: token,
        remoteip: _ip,
    };


    let response = client
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .json(&payload)
        .send()
        .await?;

    response.json::<SiteVerifyResponse>().await
}