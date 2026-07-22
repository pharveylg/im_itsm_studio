export type ItsmModuleKey =
  | "incident"
  | "major_incident"
  | "problem"
  | "change"
  | "knowledge"
  | "service_catalog";

export type ItsmModuleDefinition = {
  key: ItsmModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  numberPrefixes: string[];
  tableHints: string[];
  keywords: string[];
  analysisFocus: string[];
};

export const ITSM_MODULES: Record<ItsmModuleKey, ItsmModuleDefinition> = {
  incident: {
    key: "incident",
    label: "Incidents",
    shortLabel: "Incident",
    description: "Service disruptions and user-reported issues requiring restoration.",
    numberPrefixes: ["INC"],
    tableHints: ["incident", "incident_task", "task_sla", "sys_journal_field"],
    keywords: ["incident", "caller", "impact", "urgency", "priority", "resolution", "workaround"],
    analysisFocus: [
      "classification and priority accuracy",
      "assignment and ownership",
      "restoration timeline and SLA posture",
      "work notes quality and communication",
      "links to problem, change, knowledge, or catalog items",
    ],
  },
  major_incident: {
    key: "major_incident",
    label: "Major Incidents",
    shortLabel: "Major Incident",
    description: "High-impact incidents requiring major-incident process controls and bridge management.",
    numberPrefixes: ["INC", "MI"],
    tableHints: ["incident", "incident_alert", "task_sla", "sys_journal_field", "major_incident"],
    keywords: [
      "major incident",
      "major_incident",
      "bridge",
      "war room",
      "business impact",
      "communication plan",
      "severity",
      "p1",
      "critical",
    ],
    analysisFocus: [
      "major-incident declaration criteria and timing",
      "bridge / command ownership",
      "business-impact communication cadence",
      "executive and stakeholder updates",
      "stabilization vs root-cause separation",
      "post-incident follow-through into problem/change",
    ],
  },
  problem: {
    key: "problem",
    label: "Problems",
    shortLabel: "Problem",
    description: "Root-cause analysis, known errors, and permanent corrective action tracking.",
    numberPrefixes: ["PRB"],
    tableHints: ["problem", "problem_task", "incident", "kb_knowledge", "task_ci"],
    keywords: ["problem", "root cause", "known error", "workaround", "permanent fix", "cause notes"],
    analysisFocus: [
      "problem intake quality and related-incident linkage",
      "root-cause evidence and confidence",
      "workaround completeness",
      "known-error / knowledge handoff",
      "permanent fix ownership and due dates",
    ],
  },
  change: {
    key: "change",
    label: "Changes",
    shortLabel: "Change",
    description: "Authorized modifications to services, including normal, standard, and emergency changes.",
    numberPrefixes: ["CHG", "CTASK"],
    tableHints: ["change_request", "change_task", "sysapproval_approver", "task_ci", "incident"],
    keywords: [
      "change",
      "change_request",
      "cab",
      "implementation plan",
      "backout",
      "risk",
      "emergency change",
      "standard change",
    ],
    analysisFocus: [
      "change type and risk classification",
      "planning completeness and backout readiness",
      "approval quality and CAB evidence",
      "implementation window adherence",
      "post-implementation validation and incident linkage",
    ],
  },
  knowledge: {
    key: "knowledge",
    label: "Knowledge",
    shortLabel: "Knowledge",
    description: "Knowledge articles, known errors, runbooks, and operational guidance.",
    numberPrefixes: ["KB"],
    tableHints: ["kb_knowledge", "kb_use", "kb_feedback", "kb_category"],
    keywords: ["knowledge", "kb_knowledge", "article", "known error", "runbook", "workaround article", "kb"],
    analysisFocus: [
      "article relevance and freshness",
      "linkage from incident/problem records",
      "actionability of workaround or fix steps",
      "ownership and review cadence",
      "gaps where knowledge should exist but does not",
    ],
  },
  service_catalog: {
    key: "service_catalog",
    label: "Service Catalog",
    shortLabel: "Service Catalog",
    description: "Catalog items, requests, requested items, and fulfillment workflows.",
    numberPrefixes: ["REQ", "RITM", "SCTASK", "SCTask"],
    tableHints: ["sc_request", "sc_req_item", "sc_task", "sc_cat_item", "catalog_ui_policy", "item_option_new"],
    keywords: [
      "service catalog",
      "catalog",
      "sc_request",
      "sc_req_item",
      "requested item",
      "ritm",
      "fulfillment",
      "catalog item",
      "request",
    ],
    analysisFocus: [
      "request intake completeness and variable quality",
      "item-to-fulfillment flow integrity",
      "approval and assignment bottlenecks",
      "SLA / delivery commitments",
      "handoffs into incident, change, or knowledge when fulfillment fails",
    ],
  },
};

export const ITSM_MODULE_LIST = Object.values(ITSM_MODULES);

export const CORE_ITSM_MODULE_KEYS: ItsmModuleKey[] = [
  "incident",
  "major_incident",
  "problem",
  "change",
  "knowledge",
  "service_catalog",
];

export function detectModulesFromText(value: string): ItsmModuleKey[] {
  const lowered = value.toLowerCase();
  const hits = new Set<ItsmModuleKey>();

  for (const module of ITSM_MODULE_LIST) {
    const keywordHit = module.keywords.some((keyword) => lowered.includes(keyword.toLowerCase()));
    const tableHit = module.tableHints.some((table) => lowered.includes(table.toLowerCase()));
    const prefixHit = module.numberPrefixes.some((prefix) => {
      const pattern = new RegExp(`\\b${prefix}\\d+`, "i");
      return pattern.test(value);
    });

    if (keywordHit || tableHit || prefixHit) {
      hits.add(module.key);
    }
  }

  // Major incident is a specialization of incident.
  if (
    hits.has("incident")
    && (lowered.includes("major incident")
      || lowered.includes("major_incident")
      || lowered.includes("major-incident")
      || /\bp1\b/i.test(value)
      || lowered.includes("critical outage")
      || lowered.includes("bridge call"))
  ) {
    hits.add("major_incident");
  }

  return Array.from(hits);
}

export function moduleCoveragePromptBlock() {
  return ITSM_MODULE_LIST.map((module) => {
    const focus = module.analysisFocus.map((item) => `  - ${item}`).join("\n");
    return [
      `${module.label} (${module.key})`,
      `Purpose: ${module.description}`,
      "Review focus:",
      focus,
    ].join("\n");
  }).join("\n\n");
}
