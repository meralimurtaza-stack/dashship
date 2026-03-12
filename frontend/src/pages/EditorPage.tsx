import { useReducer, useCallback, useState, useMemo, type FC } from 'react'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import type { GeneratedDashboard } from '../lib/generate-api'
import type { Sheet, DashboardLayoutItem } from '../types/sheet'
import type { ColumnSchema } from '../types/datasource'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import type { CalculatedField } from '../engine/formulaParser'
import { editorReducer, initialEditorState } from '../types/editor'
import FieldsPanel from '../components/editor/FieldsPanel'
import DashboardCanvas from '../components/editor/DashboardCanvas'
import CaptainPanel from '../components/editor/CaptainPanel'
import ResizeHandle from '../components/editor/ResizeHandle'
import SheetEditor from '../components/sheet-editor/SheetEditor'
import PublishModal from '../components/publish/PublishModal'

interface EditorPageProps {
  dashboard: GeneratedDashboard
  data: Record<string, unknown>[]
  columns: ColumnSchema[]
  dataContext: ChatDataContext | null
  chatMessages?: ChatMessage[]
  calculatedFields?: CalculatedField[]
  onBackToChat?: () => void
}

const EditorPage: FC<EditorPageProps> = ({
  dashboard,
  data,
  columns,
  dataContext,
  chatMessages,
  calculatedFields,
  onBackToChat,
}) => {
  const [state, dispatch] = useReducer(editorReducer, {
    ...initialEditorState,
    sheets: dashboard.sheets,
    layout: dashboard.layout,
    dashboardName: dashboard.name,
  })

  const [fieldsPanelWidth, setFieldsPanelWidth] = useState(220)
  const [chatPanelWidth, setChatPanelWidth] = useState(350)
  const [activeField, setActiveField] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // ── DnD handlers (fields panel → canvas is informational only for now) ──

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const fieldData = event.active.data.current
    if (fieldData?.type === 'field') {
      setActiveField(fieldData.field.name)
    }
  }, [])

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    setActiveField(null)
  }, [])

  // ── Sheet actions ─────────────────────────────────────────────

  const handleAddChart = useCallback(() => {
    const id = crypto.randomUUID()
    const maxY = state.layout.items.length > 0
      ? Math.max(...state.layout.items.map((i) => i.y + i.h))
      : 0

    const newSheet: Sheet = {
      id,
      projectId: '',
      dataSourceId: '',
      name: 'New Chart',
      markType: 'bar',
      encoding: {},
      config: {},
      filters: [],
    }

    const layoutItem: DashboardLayoutItem = {
      sheetId: id,
      x: 0,
      y: maxY,
      w: 6,
      h: 4,
    }

    dispatch({ type: 'ADD_SHEET', sheet: newSheet, layoutItem })
    dispatch({ type: 'EDIT_SHEET', sheetId: id })
  }, [state.layout.items])

  const handleDeleteSheet = useCallback((sheetId: string) => {
    dispatch({ type: 'DELETE_SHEET', sheetId })
  }, [])

  const handleUpdateSheet = useCallback((sheet: Sheet) => {
    dispatch({ type: 'UPDATE_SHEET', sheet })
  }, [])

  // ── Editing sheet ─────────────────────────────────────────────

  const editingSheet = useMemo(
    () => state.editingSheetId ? state.sheets.find((s) => s.id === state.editingSheetId) : null,
    [state.editingSheetId, state.sheets]
  )

  // ── Captain command handler ───────────────────────────────────

  const handleCaptainCommand = useCallback((_cmd: string) => {
    // Commands processed via the chat API — the response from Captain
    // would ideally update the dashboard state. For now, messages flow through
    // the chat hook.
  }, [])

  // ── Sheet Editor Overlay ──────────────────────────────────────

  if (editingSheet) {
    return (
      <SheetEditor
        sheet={editingSheet}
        columns={columns}
        data={data}
        calculatedFields={calculatedFields}
        onUpdate={handleUpdateSheet}
        onDone={() => dispatch({ type: 'EDIT_SHEET', sheetId: null })}
      />
    )
  }

  // ── Main Editor Layout ────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="p-1 hover:opacity-60 transition-opacity"
              aria-label="Back to chat"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          {isEditingName ? (
            <input
              value={state.dashboardName}
              onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="font-mono text-sm font-semibold text-ink bg-transparent border-b border-gray-300 focus:border-gray-900 outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="font-mono text-sm font-semibold text-ink hover:opacity-60 transition-opacity"
            >
              {state.dashboardName}
            </button>
          )}
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
            {state.sheets.length} charts
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide
              border transition-colors
              ${state.chatOpen
                ? 'bg-gray-900 text-white border-gray-900'
                : 'text-gray-500 border-gray-200 hover:border-gray-900 hover:text-ink'}
            `}
            style={{ borderRadius: 2 }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
            </svg>
            Captain
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide bg-gray-900 text-white border border-gray-900 hover:bg-gray-800 transition-colors"
            style={{ borderRadius: 2 }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            Publish
          </button>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Fields Panel */}
          <div style={{ width: fieldsPanelWidth }} className="shrink-0">
            <FieldsPanel columns={columns} calculatedFields={calculatedFields} />
          </div>

          <ResizeHandle
            direction="horizontal"
            onResize={(delta) =>
              setFieldsPanelWidth((w) => Math.max(160, Math.min(400, w + delta)))
            }
          />

          {/* Centre: Canvas */}
          <DashboardCanvas
            layout={state.layout}
            sheets={state.sheets}
            data={data}
            calculatedFields={calculatedFields}
            selectedSheetId={state.selectedSheetId}
            onSelectSheet={(id) => dispatch({ type: 'SELECT_SHEET', sheetId: id })}
            onEditSheet={(id) => dispatch({ type: 'EDIT_SHEET', sheetId: id })}
            onDeleteSheet={handleDeleteSheet}
            onAddChart={handleAddChart}
            onMoveItem={(sheetId, x, y) => dispatch({ type: 'MOVE_ITEM', sheetId, x, y })}
            onResizeItem={(sheetId, w, h) => dispatch({ type: 'RESIZE_ITEM', sheetId, w, h })}
          />

          {/* Right: Captain Chat */}
          {state.chatOpen && (
            <>
              <ResizeHandle
                direction="horizontal"
                onResize={(delta) =>
                  setChatPanelWidth((w) => Math.max(280, Math.min(500, w + delta)))
                }
              />
              <div style={{ width: chatPanelWidth }} className="shrink-0">
                <CaptainPanel
                  dataContext={dataContext}
                  existingMessages={chatMessages}
                  onCommand={handleCaptainCommand}
                />
              </div>
            </>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeField && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono bg-white border border-gray-300 shadow-sm" style={{ borderRadius: 2 }}>
              <span className="w-1.5 h-1.5 bg-gray-400" style={{ borderRadius: 1 }} />
              {activeField}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishModal
          dashboardName={state.dashboardName}
          sheets={state.sheets}
          layout={state.layout}
          data={data}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </div>
  )
}

export default EditorPage
