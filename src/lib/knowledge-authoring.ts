/**
 * Knowledge article authoring prompts and helpers.
 * Generates ServiceNow-ready HTML output for KB articles.
 */

export type KnowledgeArticleInput = {
  title: string;
  summary: string;
  articleType: "kb_knowledge" | "how_to" | "troubleshooting" | "policy" | "known_error" | "faqs";
  category: string;
  kbBase: string;
  audience: string;
  sourceMaterial?: string; // Optional context from incident/problem/change records
};

export type ImagePlaceholder = {
  id: string;
  type: "image" | "screenshot" | "diagram" | "icon";
  description: string;
  altText: string;
  suggestedCaption?: string;
};

export type KnowledgeArticleOutput = {
  title: string;
  summary: string;
  body: string; // HTML formatted for ServiceNow
  metadata: {
    articleType: string;
    category: string;
    kbBase: string;
    audience: string;
    tags: string[];
  };
  // AI-suggested metadata overrides (user can accept or modify)
  suggestedMetadata?: {
    articleType?: string;
    category?: string;
    kbBase?: string;
    audience?: string;
    tags?: string[];
  };
  // Image placeholders for SNOW attachment workflow
  imagePlaceholders: ImagePlaceholder[];
};

export function knowledgeSystemPrompt() {
  return [
    "You are a senior ITSM knowledge management author working in ServiceNow.",
    "Your job is to produce publication-ready knowledge articles that follow the supplied style guide exactly.",
    "",
    "OUTPUT FORMAT RULES:",
    "- Return the article body as clean, semantic HTML suitable for ServiceNow's HTML field.",
    "- Use <h2> for major sections, <h3> for subsections, <p> for body text.",
    "- Use <ul>/<ol> for lists, <table> for structured data, <code> for commands/values.",
    "- Use <div class='note'> for notes, <div class='warning'> for warnings, <div class='tip'> for tips.",
    "- Never include <html>, <head>, <body> tags — only the inner article markup.",
    "- Never include markdown fences or raw markdown in the HTML output.",
    "",
    "IMAGE PLACEHOLDER RULES:",
    "- ServiceNow uses an attachment-based image workflow, NOT embedded base64 images.",
    "- When the article needs an image, screenshot, diagram, or icon, insert a placeholder using this exact syntax:",
    "  [IMAGE:description|alt_text|caption]",
    "  [SCREENSHOT:description|alt_text|caption]",
    "  [DIAGRAM:description|alt_text|caption]",
    "  [ICON:description|alt_text]",
    "- Examples:",
    "  [IMAGE:ServiceNow incident form showing priority field|Incident form with priority highlighted|The incident form with the priority field call]",
    "  [SCREENSHOT:Outlook error message|Outlook certificate error dialog|Certificate trust error when launching Outlook]",
    "  [DIAGRAM:Network topology for VPN connection|VPN tunnel diagram|How the VPN tunnel connects remote users]",
    "- Place placeholders where the image would naturally appear in the flow.",
    "- Always include descriptive alt text for accessibility.",
    "- The caption is optional but recommended for screenshots and diagrams.",
    "",
    "CONTENT RULES:",
    "- Lead with the most important information (inverted pyramid).",
    "- Use second-person imperative for procedures ('Click...', 'Enter...', 'Verify...').",
    "- Include a 'Prerequisites' section when the article involves changes or elevated access.",
    "- Include a 'Related Records' section linking to relevant incidents, problems, or changes when source material is provided.",
    "- Mark uncertain or environment-specific details with <em>verify in your environment</em>.",
    "- Keep sentences short. Aim for a Flesch-Kincaid grade 8-10 reading level.",
    "",
    "METADATA OVERRIDE RULES:",
    "- Analyze the content and suggest the most appropriate metadata values.",
    "- If the user-provided article type, category, KB, or audience doesn't fit the content, suggest better values.",
    "- Return suggested overrides in a 'suggestedMetadata' object with your recommendations.",
    "- Only suggest overrides when you have high confidence the new value is more accurate.",
    "",
    "SERVICENOW PUBLISHING RULES:",
    "- The title should be specific and searchable (include product, symptom, or task keywords).",
    "- The summary appears in search results — make it a 1-2 sentence value statement.",
    "- Use the article type to structure the body (troubleshooting = symptom/cause/resolution; how_to = numbered steps).",
    "- Include metadata tags as plain text at the end for the 'Keywords' field.",
    "",
    "RETURN FORMAT:",
    "Return JSON with this exact shape:",
    '{',
    '  "title": "...",',
    '  "summary": "...",',
    '  "body": "<h2>...</h2>[IMAGE:...|...|...]<p>...</p>...",',
    '  "tags": ["tag1", "tag2"],',
    '  "suggestedMetadata": {',
    '    "articleType": "how_to",',
    '    "category": "Applications",',
    '    "kbBase": "IT Service Management",',
    '    "audience": "IT Support",',
    '    "tags": ["additional_tag"]',
    '  },',
    '  "imagePlaceholders": [',
    '    {"id":"img1","type":"screenshot","description":"...","altText":"...","suggestedCaption":"..."}',
    '  ]',
    '}',
  ].join("\n");
}

export function knowledgeUserPrompt(
  input: KnowledgeArticleInput,
  styleGuide: string
): string {
  const sourceSection = input.sourceMaterial
    ? [
        "SOURCE MATERIAL FOR CONTEXT:",
        "The following records should inform the article. Extract relevant symptoms, causes, resolutions, and workarounds.",
        "",
        input.sourceMaterial,
        "",
      ].join("\n")
    : [];

  return [
    "STYLE GUIDE (follow exactly):",
    styleGuide || "Use standard ITSM knowledge article formatting: clear headings, numbered steps for procedures, tables for reference data.",
    "",
    "ARTICLE REQUEST:",
    `Title: ${input.title}`,
    `Summary: ${input.summary}`,
    `Initial Article Type: ${input.articleType}`,
    `Initial Category: ${input.category}`,
    `Initial Knowledge Base: ${input.kbBase}`,
    `Initial Target Audience: ${input.audience}`,
    "",
    "INSTRUCTIONS:",
    "1. Generate the complete article body as HTML with image placeholders where visuals are needed.",
    "2. Review the initial metadata values. If the content suggests different values, include them in 'suggestedMetadata'.",
    "3. List all image placeholders in the 'imagePlaceholders' array with unique IDs.",
    "",
    ...sourceSection,
    "Generate the complete ServiceNow-ready knowledge article now.",
  ].join("\n");
}

export function extractKnowledgeArticle(text: string): KnowledgeArticleOutput | null {
  // Try to parse JSON from the response
  let parsed: unknown = null;
  
  // First, try direct JSON parse
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    // Fallback: wrap the whole text as the body
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  
  // Extract image placeholders from the body
  const body = String(obj.body || "");
  const imagePlaceholders = extractImagePlaceholders(body);
  
  return {
    title: String(obj.title || ""),
    summary: String(obj.summary || ""),
    body,
    metadata: {
      articleType: String(obj.articleType || "kb_knowledge"),
      category: String(obj.category || ""),
      kbBase: String(obj.kbBase || ""),
      audience: String(obj.audience || ""),
      tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
    },
    suggestedMetadata: obj.suggestedMetadata as KnowledgeArticleOutput["suggestedMetadata"],
    imagePlaceholders,
  };
}

/** Extract image placeholders from HTML body text */
export function extractImagePlaceholders(body: string): ImagePlaceholder[] {
  const placeholders: ImagePlaceholder[] = [];
  
  // Match patterns like [IMAGE:description|alt_text|caption] or [SCREENSHOT:description|alt_text]
  const pattern = /\[(IMAGE|SCREENSHOT|DIAGRAM|ICON):([^\]]+)\]/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  
  while ((match = pattern.exec(body)) !== null) {
    const type = match[1].toLowerCase() as ImagePlaceholder["type"];
    const parts = match[2].split("|");
    
    placeholders.push({
      id: `img_${++index}`,
      type,
      description: parts[0]?.trim() || "",
      altText: parts[1]?.trim() || "",
      suggestedCaption: parts[2]?.trim() || undefined,
    });
  }
  
  return placeholders;
}

/** Convert image placeholders to SNOW attachment references */
export function convertPlaceholdersToSnow(body: string): string {
  return body.replace(
    /\[(IMAGE|SCREENSHOT|DIAGRAM|ICON):([^\]]+)\]/gi,
    (_match, type, params) => {
      const parts = params.split("|");
      const description = parts[0]?.trim() || "";
      const altText = parts[1]?.trim() || "";
      const caption = parts[2]?.trim();
      
      // SNOW uses sys_attachment references
      // Format: <img src="sys_attachment.do?sys_id=ATTACHMENT_SYS_ID" alt="..." />
      const captionHtml = caption ? `<br/><em>${escapeHtml(caption)}</em>` : "";
      
      return `<div class="image-placeholder" data-image-type="${type.toLowerCase()}">` +
        `<img src="sys_attachment.do?sys_id=PENDING_${description.replace(/\s+/g, "_").toUpperCase()}" alt="${escapeHtml(altText)}" />` +
        captionHtml +
        `</div>`;
    }
  );
}

/** Generate a plain-text checklist of images to upload */
export function generateImageChecklist(placeholders: ImagePlaceholder[]): string {
  if (placeholders.length === 0) return "";
  
  const lines = [
    "=== IMAGES TO UPLOAD TO SERVICENOW ===",
    "After creating the KB article, upload these images as attachments:",
    "",
  ];
  
  placeholders.forEach((img, index) => {
    lines.push(`${index + 1}. [${img.type.toUpperCase()}] ${img.description}`);
    lines.push(`   Alt text: ${img.altText}`);
    if (img.suggestedCaption) lines.push(`   Caption: ${img.suggestedCaption}`);
    lines.push(`   → Upload as attachment, then update sys_id in the article`);
    lines.push("");
  });
  
  return lines.join("\n");
}

export function wrapForServiceNow(article: KnowledgeArticleOutput): string {
  // Convert placeholders to SNOW attachment references
  const bodyWithSnowImages = convertPlaceholdersToSnow(article.body);
  
  return [
    `<h1>${escapeHtml(article.title)}</h1>`,
    `<div class="article-summary"><strong>Summary:</strong> ${escapeHtml(article.summary)}</div>`,
    `<hr/>`,
    bodyWithSnowImages,
    `<hr/>`,
    `<div class="article-metadata">`,
    `<p><strong>Article Type:</strong> ${escapeHtml(article.metadata.articleType)}</p>`,
    `<p><strong>Category:</strong> ${escapeHtml(article.metadata.category)}</p>`,
    `<p><strong>Knowledge Base:</strong> ${escapeHtml(article.metadata.kbBase)}</p>`,
    `<p><strong>Audience:</strong> ${escapeHtml(article.metadata.audience)}</p>`,
    `<p><strong>Keywords:</strong> ${article.metadata.tags.join(", ")}</p>`,
    `</div>`,
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const ARTICLE_TYPES = [
  { value: "kb_knowledge", label: "General Knowledge" },
  { value: "how_to", label: "How-To / Procedure" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "policy", label: "Policy / Standard" },
  { value: "known_error", label: "Known Error" },
  { value: "faqs", label: "FAQ" },
] as const;

export const KB_BASES = [
  "IT Service Management",
  "Customer Support",
  "Engineering",
  "Human Resources",
  "Facilities",
  "Finance",
] as const;

export const CATEGORIES = [
  "Applications",
  "Hardware",
  "Network",
  "Security",
  "Database",
  "Cloud",
  "Email",
  "Collaboration",
  "Access Management",
  "Other",
] as const;
