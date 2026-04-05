import { useState, useEffect, useCallback, useMemo, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PublishConfig, AccessLevel, PublishBranding } from '../../types/publish'
import { DEFAULT_BRANDING, FONT_PRESETS } from '../../types/publish'
import { publishDashboard, getViewUrl, getEmbedCode } from '../../lib/publish-api'
import { saveDashboard } from '../../lib/dashboard-storage'
import { createDock, getDockByUser } from '../../lib/dock-api'
import { useAuth } from '../../contexts/AuthContext'
import EmailReportConfig from './EmailReportConfig'
import { listEntries } from '../../lib/data-dictionary-storage'
import type { DictionaryEntry } from '../../types/data-dictionary'

interface PublishModalProps {
  dashboardId?: string
  projectId?: string
  dashboardName: string
  jsxCode: string
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

const PublishModal: FC<PublishModalProps> = ({ dashboardId, projectId, dashboardName, jsxCode, data, onClose, onPublished }) => {
  const navigate = useNavigate()
  const { user, isAnonymous, signUpWithEmail } = useAuth()
  const [showSignUp, setShowSignUp] = useState(false)
  const [signUpCompleted, setSignUpCompleted] = useState(false)
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpError, setSignUpError] = useState('')
  const [signingUp, setSigningUp] = useState(false)
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
  const [dictEntries, setDictEntries] = useState<DictionaryEntry[]>([])

  // Load dictionary entries for summary
  useEffect(() => {
    if (projectId) {
      listEntries(projectId).then(setDictEntries).catch(() => {})
    }
  }, [projectId])

  const previewUrl = useMemo(() => getViewUrl(slug || 'your-dashboard'), [slug])

  const handleSignUp = useCallback(async () => {
    if (!signUpEmail.trim() || !signUpPassword.trim()) {
      setSignUpError('Email and password are required')
      return
    }
    if (signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters')
      return
    }
    setSigningUp(true)
    setSignUpError('')
    try {
      const { error } = await signUpWithEmail(signUpEmail, signUpPassword)
      if (error) {
        setSignUpError(error.message)
      } else {
        setShowSignUp(false)
        setSignUpCompleted(true)
        // Account converted — user can now publish
      }
    } catch {
      setSignUpError('Sign up failed. Please try again.')
    } finally {
      setSigningUp(false)
    }
  }, [signUpEmail, signUpPassword, signUpWithEmail])

  const handlePublish = useCallback(async () => {
    // Gate: anonymous users must create an account first
    // Skip gate if sign-up was just completed (auth state may not have updated yet)
    if (isAnonymous && !signUpCompleted) {
      setShowSignUp(true)
      return
    }
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
        jsxCode,
        data,
        userId: user?.id,
        projectId,
        dashboardId,
      }
      const result = await publishDashboard(config)
      setPublishedSlug(result.slug)
      setPublished(true)

      // Update draft status to published
      if (dashboardId && projectId) {
        try {
          await saveDashboard({
            id: dashboardId,
            projectId,
            name: dashboardName,
            status: 'published',
            publishedSlug: result.slug,
          })
        } catch {
          // Non-critical — draft status update failed
        }
      }

      onPublished?.(result.slug)

      // Create or get the user's dock, then navigate to the dashboard inside it
      // Use a timeout so publishing doesn't hang if dock API is slow
      if (user?.id) {
        setPublishing(false)
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )

          let dock = await Promise.race([getDockByUser(user.id), timeoutPromise]).catch(() => null)
          if (!dock) {
            const displayName = user.email?.split('@')[0] || 'My Dashboard'
            dock = await Promise.race([createDock(user.id, displayName), timeoutPromise]).catch(() => null)
          }

          if (dock) {
            onClose()
            navigate(`/dock/${dock.slug}/${result.slug}`)
            return
          }
        } catch {
          // Fallback: dock creation failed or timed out, stay on success screen
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }, [slug, dashboardName, accessLevel, password, allowedEmails, branding, embedEnabled, jsxCode, data, dashboardId, projectId, onClose, onPublished, user, navigate, isAnonymous, signUpCompleted])

  const handleCopy = useCallback(async (type: 'url' | 'embed') => {
    const text = type === 'url' ? getViewUrl(publishedSlug || slug) : getEmbedCode(publishedSlug || slug)
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }, [publishedSlug, slug])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-ds-surface w-full max-w-2xl max-h-[90vh] flex flex-col animate-slideUp"
        style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}>
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
            style={{ borderRadius: 8 }}
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
            style={{ borderRadius: 8 }}
          >
            Email Reports
          </button>
        </div>

        {/* Sign Up Gate for Anonymous Users */}
        {showSignUp && (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-sm mx-auto space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-ds-surface-alt flex items-center justify-center" style={{ borderRadius: '9999px' }}>
                  <svg className="w-6 h-6 text-ds-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <h3 className="font-mono text-base font-medium text-ds-text">Create your account</h3>
                <p className="text-xs text-ds-text-muted leading-relaxed">
                  Create a free account to publish dashboards. All your existing work will be preserved.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="micro-label block mb-1">Email</label>
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3 py-2.5 font-sans text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
                    style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  />
                </div>
                <div>
                  <label className="micro-label block mb-1">Password</label>
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2.5 font-sans text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
                    style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  />
                </div>
              </div>

              {signUpError && (
                <p className="font-mono text-xs text-ds-error">{signUpError}</p>
              )}

              <button
                onClick={handleSignUp}
                disabled={signingUp}
                className="w-full px-6 py-2.5 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
                style={{ borderRadius: 10 }}
              >
                {signingUp ? 'Creating account...' : 'Create Account & Publish'}
              </button>

              <p className="text-center text-[10px] text-ds-text-dim">
                Your data stays linked to your account — nothing is lost.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!showSignUp && <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {activeTab === 'publish' ? (
            published ? (
              <PublishedSuccess
                slug={publishedSlug}
                embedEnabled={embedEnabled}
                copied={copied}
                onCopy={handleCopy}
              />
            ) : (
              <>
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

                {/* Data Dictionary Summary */}
                {dictEntries.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid var(--color-ds-border)' }}>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ds-text-dim mb-2">
                      Data Dictionary
                    </p>
                    <p className="font-sans text-xs text-ds-text-muted mb-2">
                      This dashboard uses {dictEntries.length} defined metric{dictEntries.length !== 1 ? 's' : ''}
                    </p>
                    <div className="max-h-[120px] overflow-y-auto space-y-1">
                      {dictEntries.map((e) => (
                        <div key={e.id} className="flex items-baseline gap-2">
                          <span className="font-mono text-[11px] text-ds-text shrink-0">{e.name}</span>
                          {e.formula && (
                            <span className="font-mono text-[10px] text-ds-text-dim truncate">{e.formula}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <EmailReportConfig dashboardId={publishedSlug || slug} dashboardName={dashboardName} />
          )}
        </div>}

        {/* Footer */}
        {!showSignUp && activeTab === 'publish' && !published && (
          <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderTop: '0.5px solid var(--color-ds-border)' }}>
            <button
              onClick={onClose}
              className="px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ds-text-muted hover:border-ds-accent hover:text-ds-text transition-colors"
              style={{ borderRadius: 10, border: '0.5px solid var(--color-ds-border)' }}
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-6 py-2.5 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 10 }}
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
          className="flex-1 px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
          style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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
            className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
              accessLevel === level
                ? 'bg-ds-accent text-white'
                : 'text-ds-text-muted hover:border-ds-accent hover:text-ds-text'
            }`}
            style={{ borderRadius: 8, border: accessLevel === level ? '0.5px solid var(--color-ds-accent)' : '0.5px solid var(--color-ds-border)' }}
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
          className="mt-2 w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
          style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
        />
      )}
      {accessLevel === 'invited' && (
        <textarea
          value={allowedEmails}
          onChange={(e) => onAllowedEmailsChange(e.target.value)}
          placeholder="email@example.com (one per line)"
          rows={3}
          className="mt-2 w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors resize-none"
          style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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
            className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
            style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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
              className="w-8 h-8 cursor-pointer p-0"
              style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 6 }}
            />
            <input
              value={branding.primaryColor || '#0E0D0D'}
              onChange={(e) => onBrandingChange({ ...branding, primaryColor: e.target.value })}
              className="flex-1 px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors"
              style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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
            className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface focus:border-ds-accent outline-none transition-colors appearance-none"
            style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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
      <div className="w-12 h-12 mx-auto bg-ds-surface-alt flex items-center justify-center" style={{ borderRadius: '9999px' }}>
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
          className="flex-1 px-3 py-2 font-mono text-xs text-ds-text-muted bg-ds-surface-alt outline-none"
          style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
        />
        <button
          onClick={() => onCopy('url')}
          className="px-3 py-2 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors shrink-0"
          style={{ borderRadius: 8 }}
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
            className="flex-1 px-3 py-2 font-mono text-xs text-ds-text-muted bg-ds-surface-alt outline-none resize-none"
            style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
          />
          <button
            onClick={() => onCopy('embed')}
            className="px-3 py-2 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors shrink-0"
            style={{ borderRadius: 8 }}
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
