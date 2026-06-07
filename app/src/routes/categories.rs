use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::{NaiveDateTime, Utc}; // <-- Make sure NaiveDateTime is imported if needed elsewhere
use rand::RngExt;
use serde::{Deserialize, Serialize};

// --- Import your Category model ---
use database::models::category::Category;
use database::models::transaction::{CategoryUsageStats, Transaction};
use diesel::result::Error as DbError;

// --- Define Request Payloads ---
#[derive(Deserialize, Debug)]
pub struct CreateCategoryPayload {
    pub name: String,
    pub description: Option<String>,
    pub parent_category_id: Option<i64>,
    pub colour: Option<String>, // <-- Add colour field
}

#[derive(Deserialize, Debug)]
pub struct UpdateCategoryPayload {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub parent_category_id: Option<Option<i64>>,
    pub colour: Option<Option<String>>, // <-- Add colour field (Option<Option<String>> for updates)
}

// --- Define Query Parameter Struct ---
#[derive(Deserialize, Debug)]
pub struct CategoriesListQuery {
    #[serde(default)]
    include_deleted: bool,
    #[serde(default)]
    with_counts: bool,
}

#[derive(Serialize)]
pub struct CategoryWithStats {
    #[serde(flatten)]
    pub category: Category,
    pub line_count: i64,
    pub spending_total: f64,
    pub income_total: f64,
}

#[derive(Serialize)]
pub struct UncategorizedStats {
    pub line_count: i64,
    pub spending_total: f64,
    pub income_total: f64,
}

#[derive(Serialize)]
pub struct CategoriesWithStatsResponse {
    pub categories: Vec<CategoryWithStats>,
    pub uncategorized: UncategorizedStats,
}

fn cents_to_dollars(cents: i64) -> f64 {
    (cents as f64) / 100.0
}

fn category_stats_from_usage(usage: Option<&CategoryUsageStats>) -> (i64, f64, f64) {
    match usage {
        Some(stats) => (
            stats.line_count,
            cents_to_dollars(stats.spending_cents),
            cents_to_dollars(stats.income_cents),
        ),
        None => (0, 0.0, 0.0),
    }
}

// --- Helper for mapping DB errors to Actix errors ---
fn map_db_error(e: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", e);
    match e {
        DbError::NotFound => error::ErrorNotFound("Category not found"),
        // Consider adding more specific error mappings if needed
        // e.g., for unique constraint violations, etc.
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (u8, u8, u8) {
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let hp = (h / 60.0).rem_euclid(6.0);
    let x = c * (1.0 - (hp % 2.0 - 1.0).abs());
    let (r1, g1, b1) = if hp < 1.0 {
        (c, x, 0.0)
    } else if hp < 2.0 {
        (x, c, 0.0)
    } else if hp < 3.0 {
        (0.0, c, x)
    } else if hp < 4.0 {
        (0.0, x, c)
    } else if hp < 5.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };
    let m = l - c / 2.0;
    let clamp255 = |v: f64| (v * 255.0).round().clamp(0.0, 255.0) as u8;
    (
        clamp255(r1 + m),
        clamp255(g1 + m),
        clamp255(b1 + m),
    )
}

fn random_category_hex() -> String {
    let mut rng = rand::rng();
    let h = rng.random_range(0.0_f64..360.0);
    let s = rng.random_range(0.5..0.82);
    let l = rng.random_range(0.44..0.58);
    let (r, g, b) = hsl_to_rgb(h, s, l);
    format!("#{r:02x}{g:02x}{b:02x}")
}

fn resolve_new_category_colour(colour: Option<&str>) -> String {
    match colour.map(str::trim) {
        Some(c) if !c.is_empty() => c.to_string(),
        _ => random_category_hex(),
    }
}

// --- Route Handlers ---

// POST /categories
async fn create_category(payload: web::Json<CreateCategoryPayload>) -> Result<impl Responder> {
    let data = payload.into_inner();
    let trimmed_name = data.name.trim();
    if trimmed_name.is_empty() {
        return Ok(HttpResponse::BadRequest().json("Category name cannot be empty"));
    }
    if Category::name_taken_by_other(trimmed_name, None).map_err(map_db_error)? {
        return Ok(HttpResponse::Conflict().json("Category name already exists"));
    }
    let colour = resolve_new_category_colour(data.colour.as_deref());
    let new_category = Category::insert(
        trimmed_name,
        data.description.as_deref(),
        data.parent_category_id,
        Some(colour.as_str()),
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(new_category))
}

// GET /categories
async fn get_all_categories(query: web::Query<CategoriesListQuery>) -> Result<impl Responder> {
    let include_deleted = query.include_deleted;
    let categories = Category::all(include_deleted).map_err(map_db_error)?;

    if !query.with_counts {
        return Ok(HttpResponse::Ok().json(categories));
    }

    let usage = Transaction::usage_by_category().map_err(map_db_error)?;
    let uncategorized_usage = Transaction::uncategorized_usage().map_err(map_db_error)?;

    let categories_with_stats = categories
        .into_iter()
        .map(|category| {
            let (line_count, spending_total, income_total) =
                category_stats_from_usage(usage.get(&category.id));
            CategoryWithStats {
                line_count,
                spending_total,
                income_total,
                category,
            }
        })
        .collect();

    Ok(HttpResponse::Ok().json(CategoriesWithStatsResponse {
        categories: categories_with_stats,
        uncategorized: UncategorizedStats {
            line_count: uncategorized_usage.line_count,
            spending_total: cents_to_dollars(uncategorized_usage.spending_cents),
            income_total: cents_to_dollars(uncategorized_usage.income_cents),
        },
    }))
}

// GET /categories/{id}
async fn get_category_by_id(
    path: web::Path<i64>,
    query: web::Query<CategoriesListQuery>,
) -> Result<impl Responder> {
    let category_id = path.into_inner();
    let include_deleted = query.include_deleted;

    let category = Category::find(category_id, include_deleted)
        .map_err(map_db_error)?
        .ok_or_else(|| {
            error::ErrorNotFound(format!("Category with ID {} not found", category_id))
        })?;

    Ok(HttpResponse::Ok().json(category))
}

// PUT /categories/{id}
async fn update_category(
    path: web::Path<i64>,
    payload: web::Json<UpdateCategoryPayload>,
) -> Result<impl Responder> {
    let category_id = path.into_inner();
    let mut data = payload.into_inner();

    if let Some(ref name) = data.name {
        let trimmed_name = name.trim();
        if trimmed_name.is_empty() {
            return Ok(HttpResponse::BadRequest().json("Category name cannot be empty"));
        }
        if Category::name_taken_by_other(trimmed_name, Some(category_id)).map_err(map_db_error)? {
            return Ok(HttpResponse::Conflict().json("Category name already exists"));
        }
        data.name = Some(trimmed_name.to_string());
    }

    let updated_category = Category::update(
        category_id,
        data.name,
        data.description,
        data.parent_category_id,
        data.colour, // <-- Pass colour to update
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(updated_category))
}

// DELETE /categories/{id}
async fn delete_category(path: web::Path<i64>) -> Result<impl Responder> {
    let category_id = path.into_inner();
    // Assuming Category::delete now returns Result<(), DbError>
    // and returns NotFound if the ID doesn't exist.
    Category::delete(category_id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

// PUT /categories/{id}/undelete  <- New Handler
async fn undelete_category(
    path: web::Path<i64>, // Extract ID (u64) from path
) -> Result<impl Responder> {
    let category_id = path.into_inner();

    let existing = Category::find(category_id, true)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound(format!("Category with ID {} not found", category_id)))?;

    if Category::name_taken_by_other(&existing.name, Some(category_id)).map_err(map_db_error)? {
        return Ok(HttpResponse::Conflict().json("Category name already exists"));
    }

    let reverted_category = Category::undelete(category_id).map_err(map_db_error)?;

    // Return the reverted category object
    Ok(HttpResponse::Ok().json(reverted_category))
}

// --- Configuration function to add routes to the App ---
pub fn categories_service() -> Scope {
    web::scope("/categories")
        .route("", web::post().to(create_category))
        .route("", web::get().to(get_all_categories))
        .route("/{id}", web::get().to(get_category_by_id))
        .route("/{id}", web::put().to(update_category))
        .route("/{id}", web::delete().to(delete_category))
        // Add the new route for undeleting using PUT method
        .route("/{id}/undelete", web::put().to(undelete_category)) // <-- Added Route
}
