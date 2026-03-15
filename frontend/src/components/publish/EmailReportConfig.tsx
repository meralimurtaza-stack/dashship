import { useState, useCallback, type FC } from 'react'
import type { EmailScheduleConfig, EmailScheduleFrequency, EmailFormat } from '../../types/publish'
import { saveEmailSchedule, sendTestEmail } from '../../lib/publish-api'

interface EmailReportConfigProps {
  dashboardId: string
  dashboardName: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const EmailReportConfig: FC<EmailReportConfigProps> = ({ dashboardId, dashboardName }) => {
  const [recipients, setRecipients] = useState('')
  const [frequency, setFrequency] = useState<EmailScheduleFrequency>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [timeUtc, setTimeUtc] = useState('09:00')
  const [format, setFormat] = useState<EmailFormat>('html')
  const [subject, setSubject] = useState(`${dashboardName} — Report`)
  const [enabled, setEnabled] = useState(true)

  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [error, setError] = useState('')

  const buildConfig = useCallback((): EmailScheduleConfig => ({
    dashboardId,
    recipients: recipients.split('\n').map(e => e.trim()).filter(Boolean),
    frequency,
    dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
    dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
    timeUtc,
    format,
    subject,
    enabled,
  }), [dashboardId, recipients, frequency, dayOfWeek, dayOfMonth, timeUtc, format, subject, enabled])

  const handleSave = useCallback(async () => {
    const config = buildConfig()
    if (config.recipients.length === 0) {
      setError('Add at least one recipient')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveEmailSchedule(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [buildConfig])

  const handleSendTest = useCallback(async () => {
    const config = buildConfig()
    if (config.recipients.length === 0) {
      setError('Add at least one recipient')
      return
    }
    setSendingTest(true)
    setError('')
    try {
      await sendTestEmail(config)
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSendingTest(false)
    }
  }, [buildConfig])

  return (
    <div className="space-y-5">
      {/* Recipients */}
      <FieldGroup label="Recipients">
        <textarea
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="email@example.com (one per line)"
          rows={3}
          className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors resize-none"
        />
      </FieldGroup>

      {/* Schedule */}
      <FieldGroup label="Schedule">
        <div className="space-y-3">
          {/* Frequency */}
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as EmailScheduleFrequency[]).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wide border transition-colors ${
                  frequency === f
                    ? 'bg-ds-accent text-white border-ds-accent'
                    : 'text-ds-text-muted border-ds-border hover:border-ds-accent hover:text-ds-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Day selection */}
          <div className="flex gap-3">
            {frequency === 'weekly' && (
              <div className="flex-1">
                <label className="micro-label block mb-1">Day</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors appearance-none"
                >
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            {frequency === 'monthly' && (
              <div className="flex-1">
                <label className="micro-label block mb-1">Day of Month</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors appearance-none"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="micro-label block mb-1">
                Time (UTC)
              </label>
              <input
                type="time"
                value={timeUtc}
                onChange={(e) => setTimeUtc(e.target.value)}
                className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </FieldGroup>

      {/* Format */}
      <FieldGroup label="Format">
        <div className="flex gap-2">
          {(['html', 'pdf'] as EmailFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wide border transition-colors ${
                format === f
                  ? 'bg-ds-accent text-white border-ds-accent'
                  : 'text-ds-text-muted border-ds-border hover:border-ds-accent hover:text-ds-text'
              }`}
            >
              {f === 'html' ? 'HTML Email' : 'PDF Attachment'}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Subject */}
      <FieldGroup label="Subject Line">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 font-mono text-sm text-ds-text bg-ds-surface border border-ds-border focus:border-ds-accent outline-none transition-colors"
        />
      </FieldGroup>

      {/* Enable Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative w-9 h-5 transition-colors ${enabled ? 'bg-ds-accent' : 'bg-ds-border'}`}
          style={{ borderRadius: 10 }}
          onClick={() => setEnabled(!enabled)}
        >
          <div
            className="absolute top-0.5 w-4 h-4 bg-white transition-transform"
            style={{ borderRadius: 8, transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
          />
        </div>
        <span className="font-mono text-xs text-ds-text-muted">Schedule enabled</span>
      </label>

      {/* Error */}
      {error && <p className="font-mono text-xs text-ds-error">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 font-mono text-xs uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Schedule'}
        </button>
        <button
          onClick={handleSendTest}
          disabled={sendingTest}
          className="px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ds-text-muted border border-ds-border hover:border-ds-accent hover:text-ds-text transition-colors disabled:opacity-50"
        >
          {sendingTest ? 'Sending...' : testSent ? 'Test Sent' : 'Send Test'}
        </button>
      </div>
    </div>
  )
}

const FieldGroup: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="micro-label mb-2">{label}</p>
    {children}
  </div>
)

export default EmailReportConfig
