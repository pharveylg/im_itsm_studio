/**
 * Backfill OAS Metadata Script
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

async function backfillOasMetadata() {
  console.log("🔍 Starting OAS metadata backfill...\n");

  // Get all guidelines that don't have OAS metadata yet
  const guidelines = await db
    .select()
    .from(storedGuidelines)
    .where(isNull(storedGuidelines.oasId));

  console.log(`Found ${guidelines.length} guidelines without OAS metadata.\n`);

  let updated = 0;

  for (const guideline of guidelines) {
    let oasId: string | null = null;
    let oasVersion: string | null = null;

    // Try to detect OAS ID from filename
    const oasMatch = guideline.originalFilename.match(/OAS-(\d{3})/i);
    if (oasMatch) {
      oasId = `OAS-${oasMatch[1]}`;
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
          oasVersion: oasVersion || "1.1", // fallback version
          structuredFormat: "4-area",
          updatedAt: new Date(),
        })
        .where(eq(storedGuidelines.id, guideline.id));

      console.log(`✅ Updated: ${guideline.name} → ${oasId} v${oasVersion || "1.1"}`);
      updated++;
    } else {
      console.log(`⚠️  Skipped: ${guideline.name} (no OAS pattern found)`);
    }
  }

  console.log(`\n🎉 Backfill complete! Updated ${updated} of ${guidelines.length} guidelines.`);
}

backfillOasMetadata()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  });