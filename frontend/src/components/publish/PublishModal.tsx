import { useState, useCallback, useMemo, type FC } from 'react'
import type { Sheet, DashboardLayout } from '../../types/sheet'
import type { PublishConfig, AccessLevel, PublishBranding } from '../../types/publish'
import { DEFAULT_BRANDING, FONT_PRESETS } from '../../types/publish'
import { publishDashboard, getViewUrl, getEmbedCode } from '../../lib/publish-api'
import { saveDashboard } from '../../lib/dashboard-storage'
import EmailReportConfig from './EmailReportConfig'

interface PublishModalProps {
  dashboardId?: string
  dashboardName: string
  sheets: Sheet[]
  layout: DashboardLayout
  data: Record<string, unknown>[]
  onClose: () => void
  onPublished?: (slug: string) => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

const PublishModal: FC<PublishModalProps> = ({ dashboardId, dashboardName, sheets, layout, data, onClose, onPublished }) => {
  const [activeTab, setActiveTab] = useState<'publish' | 'email'>('publish')
  const [slug, setSlug] = useState(() => slugify(dashboardName))
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public')
  const [password, setPassword] = useState('')
  const [allowedEmails, setAllowedEmails] = useState('')
  const [branding, setBranding] = useState<PublishBranding>({ ...DEFAULT_BRANDING })
  const [embedEnabled, setEmbedEnabled] = useState(true)

  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'url' | 'embed' | null>(null)

  const previewUrl = useMemo(() => getViewUrl(slug || 'your-dashboard'), [slug])

  const handlePublish = useCallback(async () => {
    if (!slug.trim()) {
      setError('URL slug is required')
      return
    }
    setPublishing(true)
    setError('')
    try {
      const config: PublishConfig = {
        dashboardName,
        slug: slug.trim(),
        accessLevel,
        password: accessLevel === 'password' ? password : undefined,
        allowedEmails: accessLevel === 'invited' ? allowedEmails.split('\n').map(e => e.trim()).filter(Boolean) : undefined,
        branding,
        embedEnabled,
        sheets,
        layout,
        data,
      }
      const result = await publishDashboard(config)
      setPublishedSlug(result.slug)
      setPublished(true)

      // Update draft status to published
      if (dashboardId) {
        try {
          await saveDashboard({
            id: dashboardId,
            name: dashboardName,
            status: 'published',
            sheets,
            layout,
            data,
            publishedSlug: result.slug,
          })
        } catch {
          // Non-critical — draft status update failed
        }
      }

      // Auto-close and notify after 500ms
      setTimeout(() => {
        onClose()
        onPublished?.(result.slug)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }, [slug, dashboardName, accessLevel, password, allowedEmails, branding, embedEnabled, sheets, layout, data])

  const handleCopy = useCallback(async (type: 'url' | 'embed') => {
    const text = type === 'url' ? getViewUrl(publishedSlug || slug) : getEmbedCode(publishedSlug || slug)
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }, [publishedSlug, slug])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-ds-surface border border-ds-border w-full max-w-2xl max-h-[90vh] flex flex-col animate-slideUp"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-ds-border flex items-center justify-between shrink-0">
          <div>
            <p className="micro-label">
              {published ? 'Published' : 'Publish Dashboard'}
            </p>
            <h2 className="font-mono text-lg font-medium text-ds-text mt-0.5">{dashboardName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ds-text-dim hover:text-ds-text transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('publish')}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === 'publish'
                ? 'bg-ds-accent text-white'
                : 'text-ds-text-muted hover:text-ds-text'
            }`}
          >
            Publish
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === 'email'
                ? 'bg-ds-accent text-white'
                : 'text-ds-text-muted hover:text-ds-text'
            }`}
          >
            Email Reports
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {activeTab === 'publish' ? (
            published ? (
              <PublishedSuccess
                slug={publishedSlug}
                embedEnabled={embedEnabled}
                copied={copied}
                onCopy={handleCopy}
              />
            ) : (
              <PublishForm
                slug={slug}
                onSlugChange={setSlug}
                accessLevel={accessLevel}
                onAccessLevelChange={setAccessLevel}
                password={password}
                onPasswordChange={setPassword}
                allowedEmails={allowedEmails}
                onAllowedEmailsChange={setAllowedEmails}
                branding={branding}
                onBrandingChange={setBranding}
                embedEnabled={embedEnabled}
                onEmbedEnabledChange={setEmbedEnabled}
                previewUrl={previewUrl}
                error={error}
              />
            )
          ) : (
            <EmailReportConfig dashboardId={publishedSlug || slug} dashboardName={dashboardName} />
          )}
        </div>

        {/* Footer */}
        {activeTab === 'publish' && !published && (
          <div className="px-6 py-4 border-t border-ds-border flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ds-text-muted border border-ds-border hover:border-ds-accent hover:text-ds-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-6 py-2.5 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Publish Form ─────────────────────────────────────────────────

const PublishForm: FC<{
  slug: string
  onSlugChange: (s: string) => void
  accessLevel: AccessLevel
  onAccessLevelChange: (a: AccessLevel) => void
  password: string
  onPasswordChange: (p: string) => void
  allowedEmails: string
  onAllowedEmailsChange: (e: string) => void
  branding: PublishBranding
  onBrandingChange: (b: PublishBranding) => void
  embedEnabled: boolean
  onEmbedEnabledChange: (e: boolean) => void
  previewUrl: string
  error: string
}> = ({
  slug, onSlugChange,
  accessLevel, onAccessLevelChange,
  password, onPasswordChange,
  allowedEmails, onAllowedEmailsChange,
  branding, onBrandingChange,
  embedEnabled, onEmbedEnabledChange,
  previewUrl,
  error,
}) => (
  <>
    {/* URL Slug */}
    <FieldGroup label="URL Slug">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-ds-text-dim shrink-0">/view/</span>
        <input
          value={slug}
          onChange={(e) => onSlugChange(e.target.value.replace(/[^a-z0-9-]/g, ''))}
          className="flex-1 px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
          placeholder="my-dashboard"
        />
      </div>
      <p className="text-[10px] text-ds-text-dim font-mono mt-1 truncate">{previewUrl}</p>
    </FieldGroup>

    {/* Access Level */}
    <FieldGroup label="Access">
      <div className="flex gap-2">
        {(['public', 'password', 'invited'] as AccessLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => onAccessLevelChange(level)}
            className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wide border transition-colors ${
              accessLevel === level
                ? 'bg-ds-accent text-white border-ds-accent'
                : 'text-ds-text-muted border-ds-border hover:border-ds-accent hover:text-ds-text'
            }`}
          >
            {level === 'password' ? 'Password' : level === 'invited' ? 'Invite Only' : 'Public'}
          </button>
        ))}
      </div>
      {accessLevel === 'password' && (
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter password..."
          className="mt-2 w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
        />
      )}
      {accessLevel === 'invited' && (
        <textarea
          value={allowedEmails}
          onChange={(e) => onAllowedEmailsChange(e.target.value)}
          placeholder="email@example.com (one per line)"
          rows={3}
          className="mt-2 w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors resize-none"
        />
      )}
    </FieldGroup>

    {/* Client Branding */}
    <FieldGroup label="Client Branding">
      <div className="space-y-3">
        {/* Logo URL */}
        <div>
          <label className="micro-label block mb-1">
            Logo URL
          </label>
          <input
            value={branding.logoUrl || ''}
            onChange={(e) => onBrandingChange({ ...branding, logoUrl: e.target.value || undefined })}
            placeholder="https://..."
            className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
          />
        </div>

        {/* Primary Color */}
        <div>
          <label className="micro-label block mb-1">
            Brand Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={branding.primaryColor || '#0E0D0D'}
              onChange={(e) => onBrandingChange({ ...branding, primaryColor: e.target.value })}
              className="w-8 h-8 border border-ds-border cursor-pointer p-0"
            />
            <input
              value={branding.primaryColor || '#0E0D0D'}
              onChange={(e) => onBrandingChange({ ...branding, primaryColor: e.target.value })}
              className="flex-1 px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
            />
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="micro-label block mb-1">
            Font
          </label>
          <select
            value={branding.fontFamily || 'IBM Plex Sans'}
            onChange={(e) => onBrandingChange({ ...branding, fontFamily: e.target.value })}
            className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors appearance-none"
          >
            {FONT_PRESETS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Powered By Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-9 h-5 transition-colors ${
              branding.poweredByDashShip ? 'bg-ds-accent' : 'bg-ds-surface-alt'
            }`}
            style={{ borderRadius: 10 }}
            onClick={() => onBrandingChange({ ...branding, poweredByDashShip: !branding.poweredByDashShip })}
          >
            <div
              className="absolute top-0.5 w-4 h-4 bg-white transition-transform"
              style={{
                borderRadius: 8,
                transform: branding.poweredByDashShip ? 'translateX(18px)' : 'translateX(2px)',
              }}
            />
          </div>
          <span className="font-mono text-xs text-ds-text-muted">Powered by DashShip footer</span>
        </label>
      </div>
    </FieldGroup>

    {/* Embed */}
    <FieldGroup label="Embed">
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative w-9 h-5 transition-colors ${
            embedEnabled ? 'bg-ds-accent' : 'bg-ds-surface-alt'
          }`}
          style={{ borderRadius: 10 }}
          onClick={() => onEmbedEnabledChange(!embedEnabled)}
        >
          <div
            className="absolute top-0.5 w-4 h-4 bg-white transition-transform"
            style={{
              borderRadius: 8,
              transform: embedEnabled ? 'translateX(18px)' : 'translateX(2px)',
            }}
          />
        </div>
        <span className="font-mono text-xs text-ds-text-muted">Allow iframe embedding</span>
      </label>
    </FieldGroup>

    {error && (
      <p className="font-mono text-xs text-ds-error">{error}</p>
    )}
  </>
)

// ── Published Success ────────────────────────────────────────────

const PublishedSuccess: FC<{
  slug: string
  embedEnabled: boolean
  copied: 'url' | 'embed' | null
  onCopy: (type: 'url' | 'embed') => void
}> = ({ slug, embedEnabled, copied, onCopy }) => (
  <div className="space-y-6 py-4">
    <div className="text-center space-y-2">
      <div className="w-12 h-12 mx-auto bg-ds-surface-alt flex items-center justify-center">
        <svg className="w-6 h-6 text-ds-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="font-mono text-base font-medium text-ds-text">Dashboard Published</h3>
      <p className="text-xs text-ds-text-muted">Your dashboard is now live and accessible.</p>
    </div>

    {/* View URL */}
    <FieldGroup label="Dashboard URL">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={getViewUrl(slug)}
          className="flex-1 px-3 py-2 font-mono text-xs text-ds-text-muted bg-ds-surface-alt border border-ds-border outline-none"
        />
        <button
          onClick={() => onCopy('url')}
          className="px-3 py-2 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors shrink-0"
        >
          {copied === 'url' ? 'Copied' : 'Copy'}
        </button>
      </div>
    </FieldGroup>

    {/* Embed Code */}
    {embedEnabled && (
      <FieldGroup label="Embed Code">
        <div className="flex items-start gap-2">
          <textarea
            readOnly
            value={getEmbedCode(slug)}
            rows={3}
            className="flex-1 px-3 py-2 font-mono text-xs text-ds-text-muted bg-ds-surface-alt border border-ds-border outline-none resize-none"
          />
          <button
            onClick={() => onCopy('embed')}
            className="px-3 py-2 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors shrink-0"
          >
            {copied === 'embed' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </FieldGroup>
    )}
  </div>
)

// ── Field Group ──────────────────────────────────────────────────

const FieldGroup: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="micro-label mb-2">{label}</p>
    {children}
  </div>
)

export default PublishModal
