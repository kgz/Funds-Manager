use std::path::Path;

fn main() {
	let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
	let js = manifest_dir.join("static/index.min.js");
	let profile = std::env::var("PROFILE").unwrap_or_default();
	if profile == "release" && !js.is_file() {
		panic!(
			"Release build needs frontend assets in app/static (index.min.js missing). Run:\n  cd ../frontend && pnpm install && pnpm build"
		);
	}
	println!("cargo:rerun-if-changed=static/index.min.js");
	println!("cargo:rerun-if-changed=static/index.min.css");
}
