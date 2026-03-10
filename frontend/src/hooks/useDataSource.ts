import { useState, useCallback, useMemo } from 'react'
import { parseFile } from '../engine/parser'
import { detectSchema, generateProfile, inferFieldRole } from '../engine/profiler'
import type {
  DataSchema, DataProfile, ColumnOverride, ColumnType,
  FieldRole, ChangeLogEntry, ChangeAction, CsvParseOptions, Delimiter,
} from '../types/datasource'

export type UploadStage = 'idle' | 'parsing' | 'profiling' | 'done' | 'error'

let changeIdCounter = 0
const nextChangeId = () => `change_${++changeIdCounter}_${Date.now()}`

interface DataSourceState {
  stage: UploadStage
  rawSchema: DataSchema | null
  profile: DataProfile | null
  rows: Record<string, unknown>[]
  error: string | null
  file: File | null
  sourceName: string
  overrides: Record<string, ColumnOverride>
  changeLog: ChangeLogEntry[]
  csvOptions: CsvParseOptions
  detectedDelimiter: string | null
  showHidden: boolean
}

const INITIAL: DataSourceState = {
  stage: 'idle', rawSchema: null, profile: null, rows: [], error: null,
  file: null, sourceName: '', overrides: {}, changeLog: [],
  csvOptions: { headerRow: 1, delimiter: ',', encoding: 'UTF-8' },
  detectedDelimiter: null, showHidden: false,
}

export function useDataSource() {
  const [state, setState] = useState<DataSourceState>(INITIAL)

  const schema: DataSchema | null = useMemo(() => {
    if (!state.rawSchema) return null
    return {
      ...state.rawSchema,
      columns: state.rawSchema.columns.map((col) => {
        const ov = state.overrides[col.name]
        return {
          ...col,
          displayName: ov?.displayName ?? col.displayName,
          type: ov?.type ?? col.type,
          role: ov?.role ?? col.role,
          hidden: ov?.hidden ?? false,
        }
      }),
    }
  }, [state.rawSchema, state.overrides])

  const profile: DataProfile | null = useMemo(() => {
    if (!schema || !state.profile) return state.profile
    if (!Object.values(state.overrides).some((ov) => ov.type)) return state.profile
    return generateProfile(schema, state.rows)
  }, [schema, state.profile, state.overrides, state.rows])

  const addChange = useCallback((action: ChangeAction, column: string, from: string, to: string) => {
    setState((p) => ({
      ...p,
      changeLog: [...p.changeLog, { id: nextChangeId(), timestamp: Date.now(), action, column, from, to }],
    }))
  }, [])

  const processFile = useCallback(async (file: File, opts?: Partial<CsvParseOptions>) => {
    const csvOptions = { ...INITIAL.csvOptions, ...opts }
    setState((p) => ({
      ...p, stage: 'parsing', rawSchema: null, profile: null, rows: [], error: null,
      file, sourceName: p.sourceName || file.name.replace(/\.[^.]+$/, ''),
      overrides: {}, changeLog: [], csvOptions,
    }))
    try {
      const { headers, rows, fileType, detectedDelimiter } = await parseFile(file, csvOptions)
      setState((p) => ({ ...p, stage: 'profiling', detectedDelimiter: detectedDelimiter ?? null }))
      const rawSchema = detectSchema(headers, rows, file.size, fileType)
      const prof = generateProfile(rawSchema, rows)
      setState((p) => ({
        ...p, stage: 'done', rawSchema, profile: prof, rows, error: null,
        csvOptions: { ...p.csvOptions, delimiter: (detectedDelimiter as Delimiter) || p.csvOptions.delimiter },
      }))
    } catch (err) {
      setState((p) => ({
        ...p, stage: 'error', rawSchema: null, profile: null, rows: [],
        error: err instanceof Error ? err.message : 'Failed to process file',
      }))
    }
  }, [])

  const reparse = useCallback(async (opts: Partial<CsvParseOptions>) => {
    if (state.file) await processFile(state.file, opts)
  }, [state.file, processFile])

  const renameColumn = useCallback((name: string, displayName: string) => {
    setState((p) => {
      const existing = p.overrides[name]
      const oldName = existing?.displayName || name
      if (oldName === (displayName || name) && !displayName) {
        const next = { ...p.overrides }
        if (next[name]) { next[name] = { ...next[name] }; delete next[name].displayName }
        return { ...p, overrides: next }
      }
      return { ...p, overrides: { ...p.overrides, [name]: { ...p.overrides[name], displayName: displayName || undefined } } }
    })
    if (displayName && displayName !== name) addChange('rename', name, name, displayName)
  }, [addChange])

  const changeColumnType = useCallback((col: string, newType: ColumnType) => {
    setState((p) => {
      const current = p.overrides[col]?.type ?? p.rawSchema?.columns.find((c) => c.name === col)?.type ?? 'string'
      if (current === newType) return p
      const newRole: FieldRole = p.overrides[col]?.role ?? inferFieldRole(newType, col)
      return { ...p, overrides: { ...p.overrides, [col]: { ...p.overrides[col], type: newType, role: newRole } } }
    })
    addChange('change_type', col, '', newType)
  }, [addChange])

  const changeColumnRole = useCallback((col: string, newRole: FieldRole) => {
    setState((p) => {
      const current = p.overrides[col]?.role ?? p.rawSchema?.columns.find((c) => c.name === col)?.role ?? 'dimension'
      if (current === newRole) return p
      return { ...p, overrides: { ...p.overrides, [col]: { ...p.overrides[col], role: newRole } } }
    })
    const oldRole = state.overrides[col]?.role ?? state.rawSchema?.columns.find((c) => c.name === col)?.role ?? 'dimension'
    addChange('change_role', col, oldRole, newRole)
  }, [addChange, state.overrides, state.rawSchema])

  const toggleColumnVisibility = useCallback((col: string) => {
    setState((p) => {
      const hidden = p.overrides[col]?.hidden ?? false
      return { ...p, overrides: { ...p.overrides, [col]: { ...p.overrides[col], hidden: !hidden } } }
    })
    const was = state.overrides[col]?.hidden ?? false
    addChange('toggle_visibility', col, was ? 'hidden' : 'visible', was ? 'visible' : 'hidden')
  }, [addChange, state.overrides])

  const toggleShowHidden = useCallback(() => setState((p) => ({ ...p, showHidden: !p.showHidden })), [])
  const setSourceName = useCallback((name: string) => setState((p) => ({ ...p, sourceName: name })), [])

  const revertChange = useCallback((entryId: string) => {
    setState((p) => {
      const entry = p.changeLog.find((e) => e.id === entryId)
      if (!entry) return p
      const overrides = { ...p.overrides }
      const ov = { ...overrides[entry.column] }
      switch (entry.action) {
        case 'rename': delete ov.displayName; break
        case 'change_type': {
          const orig = p.rawSchema?.columns.find((c) => c.name === entry.column)
          delete ov.type; if (orig) ov.role = orig.role; break
        }
        case 'change_role': delete ov.role; break
        case 'toggle_visibility': delete ov.hidden; break
      }
      if (Object.keys(ov).length === 0) delete overrides[entry.column]
      else overrides[entry.column] = ov
      return { ...p, overrides, changeLog: p.changeLog.filter((e) => e.id !== entryId) }
    })
  }, [])

  const reset = useCallback(() => setState(INITIAL), [])

  return {
    stage: state.stage, schema, profile, rows: state.rows, error: state.error,
    file: state.file, sourceName: state.sourceName, overrides: state.overrides,
    changeLog: state.changeLog, csvOptions: state.csvOptions,
    detectedDelimiter: state.detectedDelimiter, showHidden: state.showHidden,
    processFile, reparse, renameColumn, changeColumnType, changeColumnRole,
    toggleColumnVisibility, toggleShowHidden, setSourceName, revertChange, reset,
  }
}
