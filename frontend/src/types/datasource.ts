export type ColumnType = 'number' | 'date' | 'string' | 'boolean'
export type FieldRole = 'dimension' | 'measure'

export interface ColumnSchema {
  name: string
  displayName?: string
  type: ColumnType
  role: FieldRole
  dateFormat?: string
  nullable: boolean
  sampleValues: string[]
  hidden?: boolean
}

export interface DataSchema {
  columns: ColumnSchema[]
  rowCount: number
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
}

// ── Column Overrides ────────────────────────────────────────────
export interface ColumnOverride {
  displayName?: string
  type?: ColumnType
  role?: FieldRole
  hidden?: boolean
}

// ── Change Log ──────────────────────────────────────────────────
export type ChangeAction =
  | 'rename'
  | 'change_type'
  | 'change_role'
  | 'toggle_visibility'

export interface ChangeLogEntry {
  id: string
  timestamp: number
  action: ChangeAction
  column: string
  from: string
  to: string
}

// ── CSV Parse Options ───────────────────────────────────────────
export type Delimiter = ',' | '\t' | ';' | '|'
export type Encoding = 'UTF-8' | 'Latin-1' | 'Windows-1252'

export interface CsvParseOptions {
  headerRow: number
  delimiter: Delimiter
  encoding: Encoding
}

export const DEFAULT_CSV_OPTIONS: CsvParseOptions = {
  headerRow: 1,
  delimiter: ',',
  encoding: 'UTF-8',
}

export interface NumericProfile {
  type: 'numeric'
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
  p25: number
  p75: number
  p95: number
  nullCount: number
  nullPercent: number
}

export interface CategoricalProfile {
  type: 'categorical'
  uniqueCount: number
  cardinalityRatio: number
  topValues: Array<{ value: string; count: number; percent: number }>
  nullCount: number
  nullPercent: number
}

export interface DateProfile {
  type: 'date'
  earliest: string
  latest: string
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'irregular'
  gapCount: number
  nullCount: number
  nullPercent: number
}

export interface BooleanProfile {
  type: 'boolean'
  trueCount: number
  falseCount: number
  nullCount: number
  nullPercent: number
}

export type ColumnProfile =
  | NumericProfile
  | CategoricalProfile
  | DateProfile
  | BooleanProfile

export interface CorrelationPair {
  col1: string
  col2: string
  correlation: number
}

export interface DataProfile {
  columns: Record<string, ColumnProfile>
  correlations: CorrelationPair[]
  duplicateRowCount: number
  totalRows: number
  qualitySummary: {
    completenessPercent: number
    columnsWithNulls: number
    totalColumns: number
  }
}

export interface DataSource {
  id: string
  projectId: string
  name: string
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
  filePath: string | null
  schema: DataSchema
  profile: DataProfile
  createdAt: string
  updatedAt: string
}
