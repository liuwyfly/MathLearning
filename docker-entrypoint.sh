#!/bin/sh
set -e

# Helper: read Docker Secrets from *_FILE env variables and export them
# without the _FILE suffix. This follows the convention used by official
# Docker images (MySQL, WordPress, etc.).
#
# Example: JWT_SECRET_FILE=/run/secrets/jwt_secret -> JWT_SECRET=<content>

# Debug: show environment variables ending with _FILE
if [ -n "$DEBUG" ]; then
  echo "[entrypoint] Environment variables with _FILE suffix:"
  env | grep '_FILE=' || echo "[entrypoint] None found"
fi

for var in $(env | grep '_FILE=' | cut -d= -f1); do
  secret_file=$(eval echo "\$$var")
  if [ -n "$DEBUG" ]; then
    echo "[entrypoint] Processing: $var = $secret_file"
  fi
  if [ -f "$secret_file" ]; then
    target_var=$(echo "$var" | sed 's/_FILE$//')
    # Read secret file content
    secret_value=$(cat "$secret_file")
    if [ -n "$secret_value" ]; then
      export "$target_var=$secret_value"
      if [ -n "$DEBUG" ]; then
        echo "[entrypoint] Exported: $target_var=<redacted>"
      fi
    else
      echo "[entrypoint] Warning: $secret_file is empty" >&2
    fi
  else
    echo "[entrypoint] Warning: Secret file not found: $secret_file" >&2
  fi
done

exec "$@"
