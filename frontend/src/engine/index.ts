// Data Engine — pure TypeScript, no UI
export {
  parseFormula,
  evaluateFormula,
  applyCalculatedFields,
} from './formulaParser'
export type { CalculatedField } from './formulaParser'

export {
  aggregate,
  flattenAggregateResults,
  sortRows,
  limitRows,
} from './aggregator'
export type { AggregationType, AggregationSpec, AggregateResult } from './aggregator'

export {
  applyFilters,
  createDateRangeFilter,
  createMultiSelectFilter,
  getUniqueValues,
  getValueRange,
} from './filters'

export {
  formatCompact,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  autoFormat,
  formatFieldValue,
  getConditionalColor,
  detectFormat,
} from './formatters'
export type { ConditionalColor } from './formatters'

export {
  processSheet,
  processSheets,
  quickAggregate,
  clearCache,
} from './dataEngine'
export type { ProcessSheetResult } from './dataEngine'
