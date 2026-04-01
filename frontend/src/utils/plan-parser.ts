/**
 * utils/plan-parser.ts
 *
 * Parses Captain's messages to extract:
 * 1. Clean text (with plan_delta and project-name tags stripped)
 * 2. The plan delta JSON (the full plan state)
 * 3. Optional project name
 *
 * Drop this file into src/utils/plan-parser.ts
 */

// ── Plan types ──────────────────────────────────────────────────

export interface PlanFormat {
  type: 'currency' | 'percent' | 'number' | 'compact' | 'date' | 'string';
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export interface PlanKPI {
  id: string;
  name: string;
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max';
  format?: PlanFormat;
}

export interface PlanCalculatedField {
  id: string;
  name: string;
  formula: string;
  resultType: 'number' | 'string' | 'date';
}

export interface PlanChartEncoding {
  field: string;
  granularity?: 'monthly' | 'quarterly' | 'yearly';
  aggregation?: string;
  format?: PlanFormat;
}

export interface PlanChart {
  id: string;
  name: string;
  markType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'table';
  columns: PlanChartEncoding;
  rows: PlanChartEncoding;
  color?: PlanChartEncoding | null;
  config?: {
    orientation?: 'horizontal' | 'vertical';
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
    stacked?: boolean;
  };
}

export interface PlanFilter {
  field: string;
  type: 'multi_select' | 'single_select' | 'date_range' | 'search';
}

export interface PlanDelta {
  name: string;
  currency?: string;
  kpis: PlanKPI[];
  calculatedFields: PlanCalculatedField[];
  charts: PlanChart[];
  filters: PlanFilter[];
  isNew: string[]; // IDs of items added/changed in this response
}

// ── Parser ──────────────────────────────────────────────────────

export interface ParsedMessage {
  cleanText: string;
  planDelta: PlanDelta | null;
  projectName: string | null;
}

const PROJECT_NAME_REGEX = /<project-name>([\s\S]*?)<\/project-name>/g;

/**
 * Extract plan_delta blocks using indexOf for reliability with very large JSON.
 * Regex can struggle with huge plan_delta payloads (10KB+).
 */
function extractPlanDeltas(text: string): { jsonBlocks: string[]; cleanText: string } {
  const jsonBlocks: string[] = []
  let cleanText = text
  const openTag = '<plan_delta>'
  const closeTag = '</plan_delta>'

  let safety = 0
  while (safety++ < 20) {
    const start = cleanText.indexOf(openTag)
    if (start === -1) break
    const end = cleanText.indexOf(closeTag, start)
    if (end === -1) {
      // Incomplete tag — strip everything from <plan_delta> onward
      cleanText = cleanText.slice(0, start).trim()
      break
    }
    const jsonStr = cleanText.slice(start + openTag.length, end).trim()
    jsonBlocks.push(jsonStr)
    cleanText = cleanText.slice(0, start) + cleanText.slice(end + closeTag.length)
  }

  return { jsonBlocks, cleanText: cleanText.trim() }
}

export function parsePlanMessage(rawContent: string): ParsedMessage {
  let planDelta: PlanDelta | null = null;
  let projectName: string | null = null;

  // Extract plan_delta blocks (handles very large JSON reliably)
  const { jsonBlocks, cleanText: textAfterPlan } = extractPlanDeltas(rawContent);

  // Parse the last plan_delta block
  if (jsonBlocks.length > 0) {
    const lastJson = jsonBlocks[jsonBlocks.length - 1];
    try {
      planDelta = JSON.parse(lastJson) as PlanDelta;
    } catch (e) {
      console.warn('[plan-parser] Failed to parse plan_delta JSON:', e);
      // Try to salvage — maybe truncated JSON, attempt to find valid subset
      try {
        // Find last complete object by looking for matching braces
        let depth = 0;
        let lastValidEnd = -1;
        for (let i = 0; i < lastJson.length; i++) {
          if (lastJson[i] === '{') depth++;
          else if (lastJson[i] === '}') {
            depth--;
            if (depth === 0) lastValidEnd = i + 1;
          }
        }
        if (lastValidEnd > 0) {
          planDelta = JSON.parse(lastJson.slice(0, lastValidEnd)) as PlanDelta;
        }
      } catch {
        // Give up — JSON is too broken
      }
    }
  }

  // Extract project name
  const nameMatches = [...rawContent.matchAll(PROJECT_NAME_REGEX)];
  if (nameMatches.length > 0) {
    projectName = nameMatches[0][1].trim();
  }

  // Strip project-name tags from clean text
  const cleanText = textAfterPlan.replace(PROJECT_NAME_REGEX, '').trim();

  return { cleanText, planDelta, projectName };
}

/**
 * Check if a string contains plan_delta tags (useful during streaming
 * to know whether to show the wireframe placeholder).
 */
export function containsPlanDelta(text: string): boolean {
  return text.includes('<plan_delta>');
}

/**
 * Strip plan_delta tags from streaming text so the user never
 * sees raw JSON in the chat. Call this on every streaming chunk
 * accumulation before displaying.
 */
export function stripPlanTags(text: string): string {
  const { cleanText } = extractPlanDeltas(text);
  return cleanText
    .replace(PROJECT_NAME_REGEX, '')
    .trim();
}
