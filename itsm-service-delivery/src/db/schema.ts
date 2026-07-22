import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AiProviderConfig } from "@/lib/ai-providers";

/**
 * Single-row draft of the ServiceNow REST API connection settings.
 * Populated from the Connection console; read server-side only.
 * The client secret is stored but never returned to the browser.
 */
export const connectionConfig = pgTable("connection_config", {
  id: integer("id").primaryKey().default(1),
  instanceUrl: text("instance_url").notNull(),
  clientId: text("client_id").notNull().default(""),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri").notNull(),
  authMethod: text("auth_method").notNull().default("pkce"),
  scope: text("scope").notNull().default("useraccount"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ConnectionConfigRow = typeof connectionConfig.$inferSelect;

/**
 * AI provider configurations.
 * Stores multiple provider configs; one can be marked as default.
 */
export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: text("id").primaryKey(), // provider key (openai, anthropic, etc.)
  config: jsonb("config").$type<AiProviderConfig>().notNull(),
  isDefault: integer("is_default").default(0), // 1 = default
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AiProviderConfigRow = typeof aiProviderConfigs.$inferSelect;

/**
 * Stored guideline documents for reuse across analyses.
 * The original file content is preserved so it can be re-extracted on demand.
 */
export const storedGuidelines = pgTable("stored_guidelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  // Original file info
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  // Extracted text content (pre-computed for fast reuse)
  extractedText: text("extracted_text").notNull(),
  // Metadata
  fileSizeBytes: integer("file_size_bytes").notNull(),
  wordCount: integer("word_count").default(0),
  // Usage tracking
  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StoredGuidelineRow = typeof storedGuidelines.$inferSelect;
