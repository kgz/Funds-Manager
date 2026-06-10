use actix_web::{HttpResponse, Responder};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VersionResponse {
	version: &'static str,
	git_sha: Option<&'static str>,
}

pub async fn get_version() -> impl Responder {
	HttpResponse::Ok().json(VersionResponse {
		version: env!("CARGO_PKG_VERSION"),
		git_sha: option_env!("GIT_SHA"),
	})
}
