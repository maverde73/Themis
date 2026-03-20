# AGENTS.md

## Landmines

- **`server/` and `web/` have no source code yet.** Only CLAUDE.md planning docs exist. Do not attempt to read, edit, or run commands in these directories beyond their CLAUDE.md files.
- **`mobile/CLAUDE.md` Performance section references React Native APIs** (FlashList, Pressable, TouchableOpacity, expo-image). The app is Flutter — ignore those lines entirely.
- **`styx/CLAUDE.md` says "no code implemented yet"** — this is stale. Dart packages and the Go push_bridge_server have code and tests.
- **`server/server/` and `mobile/mobile/` are duplicated stubs** containing identical copies of their parent's CLAUDE.md. The real project roots are `server/` and `mobile/`.

## Non-discoverable commands

- **Go push_bridge_server tests are not covered by `melos run test:all`.** Run separately: `cd styx/push_bridge_server && go test ./...`
- **Coverage 95% threshold for crypto_core** is a project requirement (stated in styx/CLAUDE.md) but `tool/check_coverage.sh` only enforces a single global threshold. Manually verify crypto_core coverage after changes.

## Cross-component constraints

- After any change to `styx/packages/`, run **both** `melos run test:all` (styx tests) **and** `cd mobile && flutter test` (mobile tests). The mobile app uses styx as a local path dependency — breakage is silent until tested.
