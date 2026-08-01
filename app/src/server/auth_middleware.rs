use actix_session::SessionExt;
use actix_web::body::{EitherBody, MessageBody};
use actix_web::dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform};
use actix_web::HttpResponse;
use futures_util::future::LocalBoxFuture;
use std::future::{ready, Ready};
use std::rc::Rc;

pub const SESSION_USER_ID: &str = "user_id";

pub fn is_public_api_path(path: &str) -> bool {
    matches!(
        path,
        "/api/login" | "/api/register" | "/api/me" | "/api/version" | "/api/openapi.json"
    ) || path.starts_with("/api/public/broker-reports/")
}

pub struct AuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let path = req.path().to_string();
        if path.starts_with("/api/") && !is_public_api_path(&path) {
            let session = req.get_session();
            let user_id = session.get::<i64>(SESSION_USER_ID).ok().flatten();
            if user_id.is_none() {
                let response = HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "Authentication required"
                }));
                return Box::pin(async move {
                    Ok(req.into_response(response).map_into_right_body())
                });
            }
        }

        let service = self.service.clone();
        Box::pin(async move {
            let res = service.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}

pub fn auth_middleware() -> AuthMiddleware {
    AuthMiddleware
}

pub fn session_user_id(session: &actix_session::Session) -> Option<i64> {
    session.get::<i64>(SESSION_USER_ID).ok().flatten()
}

pub fn set_session_user(session: &actix_session::Session, user_id: i64) {
    session.insert(SESSION_USER_ID, user_id).ok();
}

pub fn clear_session_user(session: &actix_session::Session) {
    session.remove(SESSION_USER_ID);
}
