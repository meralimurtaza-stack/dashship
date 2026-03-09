import { useState, useCallback } from 'react'
import { parseFile } from '../engine/parser'
import { detectSchema, generateProfile } from '../engine/profiler'
import type { DataSchema, DataProfile } from '../types/datasource'

export type UploadStage = 'idle' | 'parsing' | 'profiling' | 'done' | 'error'

interface UploadState {
  stage: UploadStage
  schema: DataSchema | null
  profile: DataProfile | null
  rows: Record<string, unknown>[]
  error: string | null
}

export function useDataUpload() {
  const [state, setState] = useState<UploadState>({
    stage: 'idle',
    schema: null,
    profile: null,
    rows: [],
    error: null,
  })

  const processFile = useCallback(async (file: File) => {
    setState({ stage: 'parsing', schema: null, profile: null, rows: [], error: null })

    try {
      const { headers, rows, fileType } = await parseFile(file)

      setState((prev) => ({ ...prev, stage: 'profiling' }))

      const schema = detectSchema(headers, rows, file.size, fileType)
      const profile = generateProfile(schema, rows)

      setState({
        stage: 'done',
        schema,
        profile,
        rows,
        error: null,
      })
    } catch (err) {
      setState({
        stage: 'error',
        schema: null,
        profile: null,
        rows: [],
        error: err instanceof Error ? err.message : 'Failed to process file',
      })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ stage: 'idle', schema: null, profile: null, rows: [], error: null })
  }, [])

  return { ...state, processFile, reset }
}
