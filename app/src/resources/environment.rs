use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use rustls::ServerConfig;
use rustls_pemfile::{certs, pkcs8_private_keys};
use std::sync::Once;
use std::{fs::File, io::BufReader, path::PathBuf};

static RUSTLS_PROVIDER_INIT: Once = Once::new();

fn ensure_rustls_provider() {
    RUSTLS_PROVIDER_INIT.call_once(|| {
        rustls::crypto::ring::default_provider()
            .install_default()
            .expect("failed to install rustls ring crypto provider");
    });
}

#[derive(PartialEq, Debug)]
pub enum Environments {
    DEV,
    TEST,
    PROD,
}

impl std::fmt::Display for Environments {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Environments::DEV => write!(f, "dev"),
            Environments::TEST => write!(f, "test"),
            Environments::PROD => write!(f, "prod"),
        }
    }
}

const IS_DEBUG: bool = !!cfg!(debug_assertions);

#[derive(Debug)]
pub struct Env<'a> {
    pub env: Environments,
    pub auto_login_id: &'a str,
}

pub const APP_ENV: Env = Env {
    env: match IS_DEBUG {
        true => Environments::DEV,
        false => Environments::PROD,
    },
    auto_login_id: "1",
};

pub const SCOPE: &str = match APP_ENV.env {
    Environments::DEV => "",
    Environments::PROD => "",
    Environments::TEST => "/",
};

pub fn load_certs(cert: PathBuf, key: PathBuf) -> Result<ServerConfig, String> {
    ensure_rustls_provider();

    let cert_file = &mut BufReader::new(File::open(&cert).map_err(|e| e.to_string())?);
    let key_file = &mut BufReader::new(File::open(&key).map_err(|e| e.to_string())?);

    let cert_chain: Vec<CertificateDer<'static>> = certs(cert_file)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut keys = pkcs8_private_keys(key_file)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if keys.is_empty() {
        return Err("Could not locate PKCS 8 private keys.".to_string());
    }

    let private_key = PrivateKeyDer::Pkcs8(keys.remove(0));

    ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, private_key)
        .map_err(|e| e.to_string())
}
