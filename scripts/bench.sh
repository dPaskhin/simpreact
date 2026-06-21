#!/usr/bin/env bash
# Runs vitest bench with production NODE_ENV (silences Inferno's dev-build warning)
# and filters vitest's hardcoded "Benchmarking is an experimental feature" stderr line.
set -e
NODE_ENV=production vitest bench "$@" 2> >(grep -Ev 'Benchmarking is an experimental feature|Breaking changes might not follow SemVer' >&2)
