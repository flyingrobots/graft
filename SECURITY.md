# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Graft, please report it
responsibly.

**Email:** james@flyingrobots.dev

Please include:

- A description of the vulnerability.
- Steps to reproduce.
- The version or commit hash affected.

You will receive an acknowledgement within 48 hours. We will work with
you to understand the issue and coordinate a fix before public
disclosure.

## Scope

Graft enforces read policy for coding agents. Security-relevant
concerns include:

- Path traversal (escaping project root).
- Policy bypass (reading banned files).
- Secret exposure (leaking credentials through any command).
- Log injection (crafted filenames polluting decision logs).

## Supported Versions

Only the latest release is supported with security updates.
