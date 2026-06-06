use rustls::{Certificate, PrivateKey, ServerConfig};
use rustls_pemfile::{certs, pkcs8_private_keys};
use std::{fs::File, io::BufReader, path::PathBuf};

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
    let cert_file = &mut BufReader::new(File::open(&cert).map_err(|e| e.to_string())?);
    let key_file = &mut BufReader::new(File::open(&key).map_err(|e| e.to_string())?);

    let cert_chain = certs(cert_file)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(Certificate)
        .collect();
    let mut keys: Vec<PrivateKey> = pkcs8_private_keys(key_file)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(PrivateKey)
        .collect();

    if keys.is_empty() {
        return Err("Could not locate PKCS 8 private keys.".to_string());
    }

    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth();
    config
        .with_single_cert(cert_chain, keys.remove(0))
        .map_err(|e| e.to_string())
}
