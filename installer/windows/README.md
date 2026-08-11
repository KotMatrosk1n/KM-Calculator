# KM Calculator Windows setup

KM Calculator uses an independently authored WiX Toolset v7 Burn bundle and MSI. The public setup executable is a small launcher that embeds and SHA-256 verifies the Burn bundle, translates the legacy `electron-updater` installer arguments, waits for setup, and returns Burn's exact exit code.

The design intentionally does not copy KM Editor's GPL-3.0-only installer source. KM Editor is a behavioral and visual reference only.

## Build prerequisites

- Windows x64
- Node.js 24 and `npm`
- PowerShell 7 (`pwsh`), not Windows PowerShell 5.1
- .NET SDK 8 or later
- WiX Toolset v7 packages restored by the projects
- Windows 10 or 11 SDK `signtool.exe` and a trusted code-signing PFX for signed builds

WiX v7 requires explicit acceptance of its OSMF EULA. Review <https://wixtoolset.org/osmf/> first. The build fails closed unless either `-AcceptWixEula` is supplied directly or the authorized build environment contains `WIX_V7_EULA_ACCEPTED=true`. The repository does not record acceptance.

## Local build

From the repository root:

```powershell
npm ci
npm run electron:pack
pwsh -NoProfile -File installer/windows/scripts/Build-KmCalculatorWindowsSetup.ps1 -AcceptWixEula
```

The driver validates the package version and Electron executable metadata, stages the complete `release/win-unpacked` payload, rejects reparse points, deterministically creates and validates the GitHub `resources/app-update.yml` that `electron-builder --dir` omits, generates stable component IDs and GUIDs, builds the MSI and Burn bundle, embeds and pins the bundle in the launcher, and writes:

- `release/KM-Calculator-Setup-<version>.exe`
- `release/latest.yml`
- `release/SHA256SUMS.txt`
- a local ignored build receipt

Intermediate payloads and local validation artifacts stay under ignored `installer/windows/obj` and `release` paths. Do not commit generated installers, smoke-test output, or local logs.

## Release signing

Unsigned local builds remain available for development. To create a signed local build, provide the PFX path and password through `KM_SIGNING_CERTIFICATE_PATH` and `KM_SIGNING_CERTIFICATE_PASSWORD`, or the matching script parameters. Set `KM_REQUIRE_SIGNING=true` (or pass `-RequireSigning`) whenever an unsigned result must be forbidden. `KM_SIGNTOOL_PATH` can identify an SDK `signtool.exe` when it is not on `PATH`.

Signed builds use SHA-256 Authenticode signatures and an RFC 3161 SHA-256 timestamp for the already stamped `KM Calculator.exe`, the MSI, the inner Burn bundle, and the final public launcher. Each signature is verified against the supplied certificate and must contain a trusted timestamp before the next layer is built. The inner bundle is signed before its SHA-256 digest is embedded in the launcher. The certificate's complete subject distinguished name is added to the staged `resources/app-update.yml` before payload harvesting; this makes `electron-updater` verify the downloaded installer against that exact publisher instead of relying on the asset hash alone.

The release workflow always sets `KM_REQUIRE_SIGNING=true`. It expects a base64-encoded PFX in the `KM_WINDOWS_SIGNING_CERTIFICATE_BASE64` repository secret and its non-empty password in `KM_WINDOWS_SIGNING_CERTIFICATE_PASSWORD`. The PFX is written only to the runner's temporary directory and removed in an `always()` cleanup step. Missing credentials, an unusable or expired certificate, an unavailable timestamp, a signer mismatch, or an invalid signature stops the workflow before publication.

## Stable installer identity

- MSI UpgradeCode: `9971df03-d3bd-4fb5-a51b-d975985eea2c`
- Burn UpgradeCode: `6fec009c-ac8f-45c2-b84b-a648204cd665`
- Burn provider key: `com.kotmatrosk1n.kmcalculator.bundle`
- MSI scope: per-machine, matching the actually published Royal Sword Calculator installer
- Canonical destination: `%ProgramFiles%\KM Calculator`

Burn is the only visible Programs and Features entry. Its chained MSI is hidden, supports major upgrades, repair, and uninstall, and owns the complete Electron payload.

## Upgrade and uninstall behavior

Setup saves its validated marker in 64-bit `HKLM\Software\KM Calculator`. Shortcut preferences are written there by the MSI and reloaded by Burn. Installation and maintenance are restricted to the single canonical `%ProgramFiles%\KM Calculator` path; the Burn variable is not command-line overridable, no folder browser is exposed, and the MSI independently rejects any other destination. Uninstall always preserves saved teams, notes, settings, and updater caches. The MSI does not accept or perform recursive cleanup of user-profile paths.

The public GitHub release history contains Royal Sword Calculator `0.2.2`, `0.3.21`, and `0.4.26`; all use the NSIS identity `cef17072-1d18-5c82-9672-1f987b4e4970`. A release is migratable only when all expected HKLM metadata, the canonical `%ProgramFiles%\Royal Sword Calculator` path, the matching exact executable version, uninstaller, Electron archive, updater configuration, and sprite manifest agree. Burn and the MSI perform independent checks; Burn's boolean is only an additional gate. The MSI derives its private canonical root from the process environment before costing and never accepts a recursive deletion path on the command line. Only then does it remove the legacy application root, shortcuts, and registry records. User data is not part of migration cleanup.

Burn detects both the legacy product key and Programs and Features key even when their values are missing or malformed. Any legacy installation at a custom location, an unknown version, or an otherwise incomplete identity blocks setup with instructions to uninstall Royal Sword Calculator first and rerun. The legacy uninstaller preserves calculator data by default, so this policy prevents side-by-side installations without recursively deleting a registry-provided custom path.

## electron-updater compatibility

The public launcher recognizes the existing Electron contract:

- `--updated` maps to Burn `/passive` and `KMUpdaterInvocation=1`.
- `--force-run` with `--updated` requests a post-update relaunch.
- updater-provided `/S` does not hide explicitly requested update progress; standalone `/S` maps to `/quiet`.
- updater-provided `/D=...` and `--package-file=...` are consumed but never opened or forwarded. Outside an updater invocation they are rejected.
- relaunch occurs only after success and only from the validated 64-bit `HKLM\Software\KM Calculator` marker at the canonical `%ProgramFiles%\KM Calculator` path, with the expected version, executable metadata, non-reparse directory chain, and `resources\app.asar`.

The custom installer does not produce an NSIS blockmap. `latest.yml` remains the authoritative `electron-updater` metadata and contains the exact asset name, byte size, and base64 SHA-512 digest.
