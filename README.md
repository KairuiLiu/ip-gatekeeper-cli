# ipgatekeeper

Guard CLI commands behind IP geolocation checks. Pre-checks your IP before running a command, and continuously monitors during execution — kills the child process if your IP leaves the allowed country.

## Install

```bash
npm install -g ipgatekeeper
```

## Usage

```bash
ipgatekeeper --country JP -- codex
ipgatekeeper -c US -i 10 -- npm start
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--country, -c` | Required. Allowed country code (e.g. JP, US) | — |
| `--interval, -i` | Check interval in seconds | 30 |
| `--api` | IP geolocation API URL | https://api.country.is/ |

### Shell alias

For convenience:

```bash
alias codex='ipgatekeeper --country JP -- codex'
```

## How it works

1. **Pre-check**: Queries your IP geolocation. If not in the allowed country, exits with code 1 — the wrapped command never starts.
2. **Runtime monitoring**: While the child process runs, checks IP every `--interval` seconds. If IP changes to a disallowed country, sends SIGTERM to the child (SIGKILL after 3s fallback).
3. **Signal forwarding**: SIGINT/SIGTERM are forwarded to the child process.

## License

MIT
