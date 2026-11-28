# Security Policy

## Scope

JobDash is a **local-only** personal application without authentication.
It is designed to run on your own machine: the API and the frontend listen on `127.0.0.1` only,
and the API rejects requests whose `Host` is not a local name.
Do not expose it to a network or the internet.

## Reporting a vulnerability

Please report vulnerabilities **privately** via GitHub's
[private vulnerability reporting](../../security/advisories/new) for this repository.
Do not open a public issue.

Include, if possible:

- affected version / commit
- steps to reproduce
- impact

You can expect an initial response within 7 days. This is a personal project, so fixes are best effort.

## Supported versions

Only the latest commit on `main` is supported.
