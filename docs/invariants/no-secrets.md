# No secrets in repo

**Legend:** all

No `.env` files, credentials, API keys, or tokens are committed
to the repository. Secrets are managed through `@git-stunts/vault`
(OS-native keychain).

## If violated

Credential exposure. Published npm packages contain secrets.
Git history permanently records sensitive values.

## How to verify

- `.gitignore` excludes `.env`, `.env.*`
- Pre-commit hook runs lint (which would flag credential patterns)
- Code review checks for hardcoded strings that look like keys
