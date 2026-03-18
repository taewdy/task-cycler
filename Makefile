BUNDLE_DIR := src-tauri/target/release/bundle

.PHONY: build upload release

build:
	npm run build

# Upload local build artifacts to an existing GitHub draft release.
# Usage: make upload VERSION=v1.2.3
upload:
ifndef VERSION
	$(error VERSION is required — e.g. make upload VERSION=v1.2.3)
endif
	find $(BUNDLE_DIR) -type f \( -name "*.dmg" -o -name "*.msi" -o -name "*.exe" -o -name "*.deb" -o -name "*.AppImage" \) \
		| xargs gh release upload $(VERSION) --clobber

# Build then upload in one step.
# Usage: make release VERSION=v1.2.3
release: build upload
