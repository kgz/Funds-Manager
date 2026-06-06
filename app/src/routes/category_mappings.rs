use actix_web::{web, HttpResponse, Responder, Scope};
use serde::Deserialize;

use database::models::category_mapping::{
    CategoryMapping, CategoryMappingsMatch, NewCategoryMapping, UpdateCategoryMapping,
};

// --- Request Payload Structs ---

#[derive(Deserialize, Debug, Clone)]
pub struct CreateMappingPayload {
    pub pattern: String,
    pub match_type: CategoryMappingsMatch,
    pub category_id: i64,
    pub priority: Option<i32>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct UpdateMappingPayload {
    // Note: ID comes from the path, not the body for updates
    pub pattern: Option<String>,
    pub match_type: Option<CategoryMappingsMatch>,
    pub category_id: Option<i64>,
    pub priority: Option<i32>,
}

// --- Route Handlers ---

async fn get_all_mappings() -> impl Responder {
    match web::block(|| CategoryMapping::all()).await {
        Ok(Ok(mappings)) => HttpResponse::Ok().json(mappings),
        Ok(Err(e)) => {
            // log::error!("Database error fetching all category mappings: {:?}", e);
            HttpResponse::InternalServerError().body("Error fetching mappings")
        }
        Err(e) => {
            // log::error!("Blocking error fetching all category mappings: {:?}", e);
            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

async fn get_all_mappings_by_category_id(path: web::Path<i64>) -> impl Responder {
    let category_id = path.into_inner();
    match web::block(move || CategoryMapping::find_by_category_id(category_id)).await {
        Ok(Ok(mappings)) => HttpResponse::Ok().json(mappings),
        Ok(Err(e)) => {
            // log
            println!("Database error fetching all category mappings: {:?}", e);
            // lo")
            HttpResponse::InternalServerError().body("Error fetching mappings")
        }
        Err(e) => {
            // log::error!("Blocking error fetching all category mappings: {:?}", e);
            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

async fn create_mapping(payload: web::Json<CreateMappingPayload>) -> impl Responder {
    let new_mapping_data = payload.into_inner(); // Consumes the Json wrapper

    // Move the owned data into the blocking closure
    match web::block(move || {
        // Create the NewCategoryMapping struct *inside* the closure
        // Now the borrow of pattern lives as long as needed within this block
        let new_mapping = NewCategoryMapping {
            pattern: &new_mapping_data.pattern, // Borrow the owned String from the moved data
            match_type: new_mapping_data.match_type,
            category_id: new_mapping_data.category_id,
            priority: new_mapping_data.priority,
        };

        CategoryMapping::insert(new_mapping) // Perform the insertion
    })
    .await
    {
        Ok(Ok(created_mapping)) => HttpResponse::Created().json(created_mapping),
        Ok(Err(e)) => {
            // log::error!("Database error creating category mapping: {:?}", e);
            println!("Database error creating category mapping: {:?}", e);
            HttpResponse::InternalServerError().body("Error creating mapping")
        }
        Err(e) => {
            // log::error!("Blocking error creating category mapping: {:?}", e);
            println!("Database error creating category mapping: {:?}", e);

            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

async fn get_mapping_by_id(path: web::Path<i64>) -> impl Responder {
    let id = path.into_inner();
    match web::block(move || CategoryMapping::find(id)).await {
        Ok(Ok(Some(mapping))) => HttpResponse::Ok().json(mapping),
        Ok(Ok(None)) => HttpResponse::NotFound().body(format!("Mapping with ID {} not found", id)),
        Ok(Err(e)) => {
            // log::error!("Database error fetching mapping by ID {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Error fetching mapping")
        }
        Err(e) => {
            // log::error!("Blocking error fetching mapping by ID {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

async fn update_mapping(
    path: web::Path<i64>,
    payload: web::Json<UpdateMappingPayload>,
) -> impl Responder {
    let id = path.into_inner();
    let update_data = payload.into_inner();

    let changeset = UpdateCategoryMapping {
        id, // Set the ID from the path
        pattern: update_data.pattern,
        match_type: update_data.match_type,
        category_id: update_data.category_id,
        priority: update_data.priority,
    };

    match web::block(move || CategoryMapping::update(&changeset)).await {
        Ok(Ok(updated_mapping)) => HttpResponse::Ok().json(updated_mapping),
        Ok(Err(diesel::result::Error::NotFound)) => {
            HttpResponse::NotFound().body(format!("Mapping with ID {} not found for update", id))
        }
        Ok(Err(e)) => {
            // log::error!("Database error updating mapping {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Error updating mapping")
        }
        Err(e) => {
            // log::error!("Blocking error updating mapping {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

async fn delete_mapping(path: web::Path<i64>) -> impl Responder {
    let id = path.into_inner();
    match web::block(move || CategoryMapping::delete(id)).await {
        Ok(Ok(())) => HttpResponse::NoContent().finish(), // 204 No Content on successful deletion
        Ok(Err(diesel::result::Error::NotFound)) => {
            HttpResponse::NotFound().body(format!("Mapping with ID {} not found for deletion", id))
        }
        Ok(Err(e)) => {
            // log::error!("Database error deleting mapping {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Error deleting mapping")
        }
        Err(e) => {
            // log::error!("Blocking error deleting mapping {}: {:?}", id, e);
            HttpResponse::InternalServerError().body("Internal server error")
        }
    }
}

// --- Route Configuration ---

pub fn category_mappings_routes() -> Scope {
    web::scope("/category_mappings")
        .route("", web::get().to(get_all_mappings))
        .route("", web::post().to(create_mapping))
        .route("/{id}", web::get().to(get_all_mappings_by_category_id))
        .route("/{id}", web::put().to(update_mapping)) // Using PUT for full updates
        .route("/{id}", web::delete().to(delete_mapping))
}
