use actix_session::Session;
use actix_web::{error, web, HttpResponse, Responder, Result};
use database::models::user::{User, UserPublic};
use serde::{Deserialize, Serialize};

use crate::server::auth_middleware::{
    clear_session_user, session_user_id, set_session_user,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthCredentials {
    email: String,
    password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MeResponse {
    authenticated: bool,
    can_register: bool,
    user: Option<UserPublic>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthSuccessResponse {
    user: UserPublic,
}

fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

fn validate_credentials(email: &str, password: &str) -> Result<(), actix_web::Error> {
    if email.trim().is_empty() {
        return Err(error::ErrorBadRequest("Email is required"));
    }
    if password.is_empty() {
        return Err(error::ErrorBadRequest("Password is required"));
    }
    if password.len() < 8 {
        return Err(error::ErrorBadRequest("Password must be at least 8 characters"));
    }
    Ok(())
}

pub async fn get_me(session: Session) -> Result<impl Responder> {
    let can_register = User::count().unwrap_or(0) == 0;
    if let Some(user_id) = session_user_id(&session) {
        let user = User::find(user_id)
            .map_err(error::ErrorInternalServerError)?
            .ok_or_else(|| error::ErrorUnauthorized("Session invalid"))?;
        return Ok(HttpResponse::Ok().json(MeResponse {
            authenticated: true,
            can_register,
            user: Some(user.into()),
        }));
    }

    Ok(HttpResponse::Ok().json(MeResponse {
        authenticated: false,
        can_register,
        user: None,
    }))
}

pub async fn register_user(
    session: Session,
    body: web::Json<AuthCredentials>,
) -> Result<impl Responder> {
    if User::count().map_err(error::ErrorInternalServerError)? > 0 {
        return Err(error::ErrorForbidden("Registration is closed"));
    }

    let email = normalize_email(&body.email);
    validate_credentials(&email, &body.password)?;

    if User::find_by_email(&email)
        .map_err(error::ErrorInternalServerError)?
        .is_some()
    {
        return Err(error::ErrorConflict("Email already registered"));
    }

    let user = User::create(&email, &body.password).map_err(error::ErrorInternalServerError)?;
    set_session_user(&session, user.id);

    Ok(HttpResponse::Created().json(AuthSuccessResponse {
        user: user.into(),
    }))
}

pub async fn login_user(
    session: Session,
    body: web::Json<AuthCredentials>,
) -> Result<impl Responder> {
    let email = normalize_email(&body.email);
    validate_credentials(&email, &body.password)?;

    let user = User::verify_login(&email, &body.password)
        .map_err(error::ErrorInternalServerError)?
        .ok_or_else(|| error::ErrorUnauthorized("Invalid email or password"))?;

    set_session_user(&session, user.id);

    Ok(HttpResponse::Ok().json(AuthSuccessResponse {
        user: user.into(),
    }))
}

pub async fn logout_user(session: Session) -> Result<impl Responder> {
    session.purge();
    clear_session_user(&session);
    Ok(HttpResponse::NoContent().finish())
}
