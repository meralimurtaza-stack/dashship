import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParseResult {
  headers: string[]
  rows: Record<string, unknown>[]
  fileType: 'csv' | 'xlsx'
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete(results) {
        const headers = results.meta.fields ?? []
        const rows = results.data as Record<string, unknown>[]
        resolve({ headers, rows, fileType: 'csv' })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        })
        const headers =
          json.length > 0 ? Object.keys(json[0]) : []
        resolve({ headers, rows: json, fileType: 'xlsx' })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv' || ext === 'tsv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file)
  return Promise.reject(new Error(`Unsupported file type: .${ext}`))
}
