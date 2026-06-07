use database::modules::database::{get_dbo, run_pending_migrations};

fn main() {
    let mut conn = get_dbo();
    run_pending_migrations(&mut conn);
    println!("Migrations complete.");
}
