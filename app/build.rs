use std::path::Path;
use std::process::Command;

fn git_sha_short() -> Option<String> {
	let output = Command::new("git")
		.args(["rev-parse", "--short", "HEAD"])
		.output()
		.ok()?;
	if !output.status.success() {
		return None;
	}
	let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
	if sha.is_empty() {
		return None;
	}
	Some(sha)
}

fn main() {
	let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
	let js = manifest_dir.join("static/index.min.js");
	let profile = std::env::var("PROFILE").unwrap_or_default();
	if profile == "release" && !js.is_file() {
		panic!(
			"Release build needs frontend assets in app/static (index.min.js missing). Run:\n  cd ../frontend && pnpm install && pnpm build"
		);
	}
	if let Some(sha) = git_sha_short() {
		println!("cargo:rustc-env=GIT_SHA={sha}");
	}
	println!("cargo:rerun-if-changed=static/index.min.js");
	println!("cargo:rerun-if-changed=static/index.min.css");
	println!("cargo:rerun-if-changed=../.git/HEAD");
}
