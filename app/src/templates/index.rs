use actix_web::Result;
use maud::PreEscaped;
use maud::{html, Markup};
use std::env;

use crate::resources::environment::Environments;
use crate::resources::environment::APP_ENV;

pub async fn index() -> Result<Markup> {
    let is_debug = APP_ENV.env == Environments::DEV;
    let vite_dev_origin = env::var("VITE_DEV_SERVER_ORIGIN")
        .map(|s| s.trim_end_matches('/').to_string())
        .unwrap_or_else(|_| "https://localhost:3000".to_string());

    Ok(html!(
        html {
            head {
                title { "Hello" }
                @if is_debug {
                    script type="module" src=(format!("{}/@vite/client", vite_dev_origin)) {}
                    script type="module" {
                    (PreEscaped(format!(r#"
                            console.log('Running in dev mode');
                            window.dev = true;
                            import RefreshRuntime from '{origin}/@react-refresh'
                            RefreshRuntime.injectIntoGlobalHook(window)
                            window.$RefreshReg$ = () => {{}}
                            window.$RefreshSig$ = () => (type) => type
                            window.__vite_plugin_react_preamble_installed__ = true;
                        "#, origin = vite_dev_origin)))
                    }
                    script type="module" src=(format!("{}/src/main.tsx", vite_dev_origin)) {}
                } @else {
                    script defer src="/static/index.min.js" {}
                    link rel="stylesheet" href="/static/index.min.css" {}
                }



            }
            body {
                // h1 { "Hello World!" }
                // p { "path: " (path) }
                // p { "is_debug: " (is_debug) }
                div id="root" {}
                // div {
                //     routes {
                //         @for (key, value) in routes {
                //             div {
                //                 h1 { (key) }
                //                 p { (value.description) }
                //             }
                //         }
                //     }
                // }
            }
        }
    ))
}
