import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { CsvParseOptions } from '../types/datasource'

export interface ParseResult {
  headers: string[]
  rows: Record<string, unknown>[]
  fileType: 'csv' | 'xlsx'
  detectedDelimiter?: string
}

export function parseCSV(
  file: File,
  options?: Partial<CsvParseOptions>
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const headerRow = options?.headerRow ?? 1
    const delimiter = options?.delimiter

    Papa.parse(file, {
      header: headerRow === 1,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: delimiter || undefined,
      complete(results) {
        let headers: string[]
        let rows: Record<string, unknown>[]
        const detectedDelimiter = results.meta.delimiter

        if (headerRow === 1) {
          headers = results.meta.fields ?? []
          rows = results.data as Record<string, unknown>[]
        } else {
          // Skip rows before header, use specified row as header
          const allRows = results.data as string[][]
          const headerIdx = headerRow - 1
          if (headerIdx >= allRows.length) {
            reject(new Error(`Header row ${headerRow} exceeds file rows (${allRows.length} total)`))
            return
          }
          headers = allRows[headerIdx].map((h, i) => {
            const trimmed = String(h).trim()
            return trimmed || `Column ${i + 1}`
          })
          const dataRows = allRows.slice(headerIdx + 1)
          rows = dataRows.map((row) => {
            const obj: Record<string, unknown> = {}
            headers.forEach((h, i) => {
              obj[h] = row[i] ?? ''
            })
            return obj
          })
        }

        resolve({ headers, rows, fileType: 'csv', detectedDelimiter })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function parseXLSX(
  file: File,
  options?: Partial<CsvParseOptions>
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const headerRow = options?.headerRow ?? 1
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        if (headerRow === 1) {
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: '',
          })
          const headers = json.length > 0 ? Object.keys(json[0]) : []
          resolve({ headers, rows: json, fileType: 'xlsx' })
        } else {
          // Parse as raw 2D array (no header), then pick the headerRow
          const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            defval: '',
          })
          const headerIdx = headerRow - 1
          if (headerIdx >= allRows.length) {
            reject(new Error(`Header row ${headerRow} exceeds file rows (${allRows.length} total)`))
            return
          }
          const headers = allRows[headerIdx].map((h, i) => {
            const trimmed = String(h).trim()
            return trimmed || `Column ${i + 1}`
          })
          const dataRows = allRows.slice(headerIdx + 1)
          const rows = dataRows.map((row) => {
            const obj: Record<string, unknown> = {}
            headers.forEach((h, i) => {
              obj[h] = row[i] ?? ''
            })
            return obj
          })
          resolve({ headers, rows, fileType: 'xlsx' })
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Raw Row Preview (first N rows before any header logic) ──────

export function previewRawRows(
  file: File,
  count: number = 5,
): Promise<string[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return previewRawXLSX(file, count)
  return previewRawCSV(file, count)
}

function previewRawCSV(file: File, count: number): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const rows: string[][] = []
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
      preview: count,
      complete(results) {
        const data = results.data as string[][]
        rows.push(...data.slice(0, count))
        resolve(rows)
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

function previewRawXLSX(file: File, count: number): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: '',
        })
        resolve(allRows.slice(0, count).map((r) => r.map((c) => String(c))))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function parseFile(
  file: File,
  options?: Partial<CsvParseOptions>
): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv' || ext === 'tsv') return parseCSV(file, options)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file, options)
  return Promise.reject(new Error(`Unsupported file type: .${ext}`))
}
