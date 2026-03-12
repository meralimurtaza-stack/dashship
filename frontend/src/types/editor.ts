import type { Sheet, DashboardLayout, DashboardLayoutItem, FieldBinding } from './sheet'
import type { ColumnSchema } from './datasource'

// ── Drag and Drop ───────────────────────────────────────────────

export type DragItemType = 'field' | 'chart' | 'shelf-pill'

export interface FieldDragItem {
  type: 'field'
  field: ColumnSchema
}

export interface ChartDragItem {
  type: 'chart'
  sheetId: string
}

export interface ShelfPillDragItem {
  type: 'shelf-pill'
  shelf: ShelfType
  binding: FieldBinding
}

export type DragItem = FieldDragItem | ChartDragItem | ShelfPillDragItem

// ── Shelf Types ─────────────────────────────────────────────────

export type ShelfType = 'columns' | 'rows' | 'color' | 'size' | 'label' | 'tooltip'

export const SHELF_LABELS: Record<ShelfType, string> = {
  columns: 'Columns',
  rows: 'Rows',
  color: 'Color',
  size: 'Size',
  label: 'Label',
  tooltip: 'Tooltip',
}

// ── Editor State ────────────────────────────────────────────────

export interface EditorState {
  sheets: Sheet[]
  layout: DashboardLayout
  dashboardName: string
  selectedSheetId: string | null
  editingSheetId: string | null
  chatOpen: boolean
}

export type EditorAction =
  | { type: 'SET_DASHBOARD'; sheets: Sheet[]; layout: DashboardLayout; name: string }
  | { type: 'UPDATE_SHEET'; sheet: Sheet }
  | { type: 'ADD_SHEET'; sheet: Sheet; layoutItem: DashboardLayoutItem }
  | { type: 'DELETE_SHEET'; sheetId: string }
  | { type: 'SELECT_SHEET'; sheetId: string | null }
  | { type: 'EDIT_SHEET'; sheetId: string | null }
  | { type: 'UPDATE_LAYOUT'; layout: DashboardLayout }
  | { type: 'MOVE_ITEM'; sheetId: string; x: number; y: number }
  | { type: 'RESIZE_ITEM'; sheetId: string; w: number; h: number }
  | { type: 'SET_NAME'; name: string }
  | { type: 'TOGGLE_CHAT' }

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_DASHBOARD':
      return {
        ...state,
        sheets: action.sheets,
        layout: action.layout,
        dashboardName: action.name,
        selectedSheetId: null,
        editingSheetId: null,
      }

    case 'UPDATE_SHEET':
      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === action.sheet.id ? action.sheet : s
        ),
      }

    case 'ADD_SHEET':
      return {
        ...state,
        sheets: [...state.sheets, action.sheet],
        layout: {
          ...state.layout,
          items: [...state.layout.items, action.layoutItem],
        },
      }

    case 'DELETE_SHEET':
      return {
        ...state,
        sheets: state.sheets.filter((s) => s.id !== action.sheetId),
        layout: {
          ...state.layout,
          items: state.layout.items.filter((i) => i.sheetId !== action.sheetId),
        },
        selectedSheetId:
          state.selectedSheetId === action.sheetId ? null : state.selectedSheetId,
        editingSheetId:
          state.editingSheetId === action.sheetId ? null : state.editingSheetId,
      }

    case 'SELECT_SHEET':
      return { ...state, selectedSheetId: action.sheetId }

    case 'EDIT_SHEET':
      return { ...state, editingSheetId: action.sheetId }

    case 'UPDATE_LAYOUT':
      return { ...state, layout: action.layout }

    case 'MOVE_ITEM':
      return {
        ...state,
        layout: {
          ...state.layout,
          items: state.layout.items.map((i) =>
            i.sheetId === action.sheetId ? { ...i, x: action.x, y: action.y } : i
          ),
        },
      }

    case 'RESIZE_ITEM':
      return {
        ...state,
        layout: {
          ...state.layout,
          items: state.layout.items.map((i) =>
            i.sheetId === action.sheetId ? { ...i, w: action.w, h: action.h } : i
          ),
        },
      }

    case 'SET_NAME':
      return { ...state, dashboardName: action.name }

    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }

    default:
      return state
  }
}

export const initialEditorState: EditorState = {
  sheets: [],
  layout: { columns: 12, rowHeight: 60, items: [] },
  dashboardName: 'Untitled Dashboard',
  selectedSheetId: null,
  editingSheetId: null,
  chatOpen: true,
}
