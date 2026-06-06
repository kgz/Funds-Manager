pub mod server {
    automod::dir!(pub "src/server");
    pub mod scopes {
        automod::dir!(pub "src/server/scopes");
    }
}

pub mod resources {
    automod::dir!(pub "src/resources");
}

pub mod templates {
    automod::dir!(pub "src/templates");
}

pub mod routes {
    automod::dir!(pub "src/routes");

    pub mod api {
        automod::dir!(pub "src/routes/api");
    }
}
