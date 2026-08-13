import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AiProviderConfig } from "@/lib/ai-providers";

/**
 * Single-row draft of the ServiceNow REST API connection settings.
 */
export const connectionConfig = pgTable("connection_config", {
  id: integer("id").primaryKey().default(1),
  instanceUrl: text("instance_url").notNull(),
  clientId: text("client_id").notNull().default(""),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri").notNull(),
  authMethod: text("auth_method").notNull().default("pkce"),
  scope: text("scope").notNull().default("useraccount"),
  serviceUsername: text("service_username"),
  servicePassword: text("service_password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConnectionConfigRow = typeof connectionConfig.$inferSelect;

/**
 * AI provider configurations.
 */
export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: text("id").primaryKey(),
  config: jsonb("config").$type<AiProviderConfig>().notNull(),
  isDefault: integer("is_default").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiProviderConfigRow = typeof aiProviderConfigs.$inferSelect;

/**
 * Stored guideline documents.
 */
export const storedGuidelines = pgTable("stored_guidelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  extractedText: text("extracted_text").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  wordCount: integer("word_count").default(0),

  // OAS Metadata
  oasId: text("oas_id"),
  oasVersion: text("oas_version"),
  structuredFormat: text("structured_format").default("4-area"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),

  // GitHub Sync Tracking
  sourceRepo: text("source_repo"),
  sourcePath: text("source_path"),
  sourceSha: text("source_sha"),

  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StoredGuidelineRow = typeof storedGuidelines.$inferSelect;

/**
 * GitHub repository configuration.
 */
export const githubConfig = pgTable("github_config", {
  id: integer("id").primaryKey().default(1),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull().default("main"),
  pat: text("pat"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GithubConfigRow = typeof githubConfig.$inferSelect;