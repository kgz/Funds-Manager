/**
 * /api/users
 */

use actix_web::{web, Scope};

use crate::routes::pdf_parser::{
    delete_statement, get_all_statements, get_missing_statement_periods, parse_pdf,
};

pub fn api_users() -> Scope {

    web::scope("")
		.route("/statements", web::post().to(parse_pdf))
		.route("/statements", web::get().to(get_all_statements))
		.route(
			"/statements/missing-periods",
			web::get().to(get_missing_statement_periods),
		)
		.route("/statements/{id}", web::delete().to(delete_statement))
        // .route("/login", web::post().to(login_user))
}
