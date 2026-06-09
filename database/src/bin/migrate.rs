use database::modules::database::migrate_on_startup;

fn main() {
    match migrate_on_startup() {
        Ok(()) => println!("Migrations complete."),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
