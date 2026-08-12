/**
 * Backfill OAS Metadata Script (Improved)
 * 
 * This script scans existing guidelines and populates OAS metadata
 * based on filename patterns and content.
 * 
 * Usage:
 *   npx tsx scripts/backfill-oas-metadata.ts
 */

import { db } from "../src/db";
import { storedGuidelines } from "../src/db/schema";
import { eq, isNull } from "drizzle-orm";

// Map of filename patterns to OAS IDs
const OAS_PATTERNS: Record<string, string> = {
  "OAS-000": "OAS-000",
  "OAS-101": "OAS-101",
  "OAS-201": "OAS-201",
  "OAS-301": "OAS-301",
  "OAS-401": "OAS-401",
  "OAS-501": "OAS-501",
  "OAS-KB-001": "OAS-KB-001",
  "OAS-KB-002": "OAS-KB-002",
  "OAS-KB-003": "OAS-KB-003",
  "OAS-KB-004": "OAS-KB-004",
  "OAS-KB-005": "OAS-KB-005",
  "OAS-KB-006": "OAS-KB-006",
};

async function backfillOasMetadata() {
  console.log("🔍 Starting OAS metadata backfill (Improved)...\n");

  // Get all guidelines that don't have OAS metadata yet
  const guidelines = await db
    .select()
    .from(storedGuidelines)
    .where(isNull(storedGuidelines.oasId));

  console.log(`Found ${guidelines.length} guidelines without OAS metadata.\n`);

  let updated = 0;
  let skipped = 0;

  for (const guideline of guidelines) {
    let oasId: string | null = null;
    let oasVersion: string | null = null;

    const filename = guideline.originalFilename.toUpperCase();

    // Try to detect OAS ID from filename using the pattern map
    for (const [pattern, id] of Object.entries(OAS_PATTERNS)) {
      if (filename.includes(pattern)) {
        oasId = id;
        break;
      }
    }

    // Try to extract version from content
    const versionMatch = guideline.extractedText.match(/version:\s*["']?(\d+\.\d+)["']?/i);
    if (versionMatch) {
      oasVersion = versionMatch[1];
    }

    if (oasId) {
      await db
        .update(storedGuidelines)
        .set({
          oasId,
          oasVersion: oasVersion || "1.2",
          structuredFormat: "4-area",
          updatedAt: new Date(),
        })
        .where(eq(storedGuidelines.id, guideline.id));

      console.log(`✅ Updated: ${guideline.name} → ${oasId} v${oasVersion || "1.2"}`);
      updated++;
    } else {
      console.log(`⚠️  Skipped: ${guideline.name} (no matching OAS pattern)`);
      skipped++;
    }
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total processed: ${guidelines.length}`);
}

backfillOasMetadata()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  });