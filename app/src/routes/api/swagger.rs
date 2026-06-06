use actix_web::web;
use utoipa::openapi::{InfoBuilder, LicenseBuilder};
use utoipa::{openapi::OpenApiBuilder, OpenApi};

#[derive(OpenApi)]
#[openapi(
    servers((url = "https://localhost:2020", description = "Local server")),
)]
pub struct ApiDoc;

#[utoipa::path(
    get,
    path = "/chaos/api/openapi.json",
    responses(
        (status = 200, description = "JSON file", body = ())
    )
)]
pub async fn openapi() -> Result<web::Json<utoipa::openapi::OpenApi>, actix_web::error::Error> {
    let mut builder: OpenApiBuilder = ApiDoc::openapi().into();
    builder = builder.info(
        InfoBuilder::new()
            .license(Some(
                LicenseBuilder::new()
                    .name("None")
                    .identifier(Some(""))
                    .build(),
            ))
            .build(),
    );
    Ok(web::Json(builder.build()))
}
