/// <reference types="node" />

import { defineConfig } from "prisma/config";

const buildDatabaseUrl = (): string | undefined => {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    return undefined;
  }

  const port = Number(process.env.MYSQL_PORT);
  const safePort = Number.isFinite(port) && port > 0 ? Math.floor(port) : 3306;

  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${safePort}/${encodeURIComponent(database)}?connection_limit=2&pool_timeout=30&connect_timeout=10`;
};

const buildShadowDatabaseUrl = (): string | undefined => {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.SHADOW_MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    return undefined;
  }

  const port = Number(process.env.MYSQL_PORT);
  const safePort = Number.isFinite(port) && port > 0 ? Math.floor(port) : 3306;

  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${safePort}/${encodeURIComponent(database)}?connection_limit=2&pool_timeout=30&connect_timeout=10`;
};


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildDatabaseUrl(),
    shadowDatabaseUrl: buildShadowDatabaseUrl(),
  },
});
