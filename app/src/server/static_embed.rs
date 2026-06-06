use actix_web::http::header::CONTENT_TYPE;
use actix_web::{HttpResponse, Responder, web};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "static/"]
struct FrontendAssets;

fn content_type_for(path: &str) -> &'static str {
	if path.ends_with(".js") {
		return "application/javascript; charset=utf-8";
	}
	if path.ends_with(".css") {
		return "text/css; charset=utf-8";
	}
	if path.ends_with(".json") {
		return "application/json; charset=utf-8";
	}
	if path.ends_with(".woff2") {
		return "font/woff2";
	}
	if path.ends_with(".woff") {
		return "font/woff";
	}
	if path.ends_with(".svg") {
		return "image/svg+xml";
	}
	if path.ends_with(".png") {
		return "image/png";
	}
	"application/octet-stream"
}

pub async fn serve_embedded(path: web::Path<String>) -> impl Responder {
	let mut rel = path.into_inner();
	rel = rel.trim_start_matches('/').to_string();
	if rel.is_empty() || rel.contains("..") {
		return HttpResponse::NotFound().finish();
	}
	match FrontendAssets::get(&rel) {
		Some(file) => HttpResponse::Ok()
			.append_header((CONTENT_TYPE, content_type_for(&rel)))
			.body(file.data.into_owned()),
		None => HttpResponse::NotFound().finish(),
	}
}
