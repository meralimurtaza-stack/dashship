import { type FC, useRef, useEffect, useState, useCallback, useMemo } from 'react'

// ── Props ────────────────────────────────────────────────────────

interface DashboardIframeProps {
  jsxCode: string
  data: Record<string, unknown>[]
  className?: string
}

// ── iframe HTML Shell ────────────────────────────────────────────

function buildSrcdoc(jsxCode: string): string {
  // Escape closing script tags inside Claude's code so they don't break the HTML
  const safeCode = jsxCode.replace(/<\/script>/gi, '<\\/script>')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: #FFFFFF;
    color: #1A1A1A;
    -webkit-font-smoothing: antialiased;
  }
  #root { min-height: 100vh; padding: 24px; }
  #error-display {
    padding: 24px;
    font-family: monospace;
    font-size: 13px;
    color: #C1403D;
    white-space: pre-wrap;
    display: none;
  }
  #loading-display {
    padding: 60px 24px;
    text-align: center;
    font-family: monospace;
    font-size: 12px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
</head>
<body>
<div id="root"><div id="loading-display">Loading libraries…</div></div>
<div id="error-display"></div>

<script>
// Error handler must be defined before anything else
function showError(msg) {
  var el = document.getElementById('error-display');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
  try { parent.postMessage({ type: 'dashship-error', message: msg }, '*'); } catch(e) {}
}
window.onerror = function(msg, src, line, col, err) {
  var detail = err && err.stack ? err.stack : (msg + ' (line ' + line + ')');
  showError('Error: ' + detail);
};
</script>

<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"><\/script>
<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"><\/script>
<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js"><\/script>
<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/recharts@2.15.0/umd/Recharts.js"><\/script>
<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.2/babel.min.js"><\/script>

<script>
// Verify libs loaded
if (typeof React === 'undefined') showError('React failed to load from CDN');
else if (typeof ReactDOM === 'undefined') showError('ReactDOM failed to load from CDN');
else if (typeof PropTypes === 'undefined') showError('PropTypes failed to load from CDN (required by Recharts)');
else if (typeof Recharts === 'undefined') showError('Recharts failed to load from CDN');
else if (typeof Babel === 'undefined') showError('Babel failed to load from CDN');
else {
  try {
    // Transpile Claude's JSX code using Babel
    var jsxCode = ${JSON.stringify(safeCode)};

    // Strip export statements that break in non-module contexts
    var cleanedCode = jsxCode
      .replace(/export\\s+default\\s+/g, '')
      .replace(/export\\s+/g, '')
      // Fix common Claude mistakes: .percentage -> .percent (Recharts prop)
      .replace(/\\.percentage\\b/g, '.percent');

    var transpiled;
    try {
      transpiled = Babel.transform(cleanedCode, {
        presets: ['react'],
        filename: 'dashboard.jsx',
      }).code;
    } catch (babelErr) {
      showError('Babel transpilation failed: ' + babelErr.message);
      throw babelErr;
    }

    // Execute in global scope so function declarations work
    (0, eval)(transpiled);

    // Error boundary class to catch render errors in individual charts
    var ErrorBoundary = (function(_super) {
      function EB(props) {
        _super.call(this, props);
        this.state = { hasError: false, error: null };
      }
      EB.prototype = Object.create(_super.prototype);
      EB.prototype.constructor = EB;
      EB.getDerivedStateFromError = function(error) {
        return { hasError: true, error: error };
      };
      EB.prototype.render = function() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: { padding: 16, color: '#C0392B', fontFamily: 'monospace', fontSize: 11, background: '#FFF8F0', border: '1px solid #E8D5C0', borderRadius: 8 }
          }, 'Chart render error: ' + (this.state.error ? this.state.error.message : 'Unknown'));
        }
        return this.props.children;
      };
      return EB;
    })(React.Component);

    // Find the Dashboard component
    var Dashboard = window.Dashboard;

    if (!Dashboard) {
      showError('Dashboard component not found in generated code');
    } else {
      // Create root once
      var rootEl = document.getElementById('root');
      rootEl.innerHTML = '';
      var root = ReactDOM.createRoot ? ReactDOM.createRoot(rootEl) : null;

      function renderDashboard(data) {
        try {
          var el = React.createElement(ErrorBoundary, null,
            React.createElement(Dashboard, { data: data })
          );
          if (root) {
            root.render(el);
          } else {
            ReactDOM.render(el, rootEl);
          }
        } catch (err) {
          showError('Render error: ' + err.message + '\\n' + err.stack);
        }
      }

      // Initial render with empty data
      renderDashboard([]);

      // Sanitize data: coerce numeric strings to numbers, replace NaN/undefined with 0
      function sanitizeRows(rows) {
        if (!rows || rows.length === 0) return rows;
        // Detect numeric columns from first row
        var sample = rows[0];
        var numericKeys = [];
        for (var key in sample) {
          var val = sample[key];
          if (typeof val === 'number' || (typeof val === 'string' && val !== '' && !isNaN(Number(val)) && val.trim() !== '')) {
            numericKeys.push(key);
          }
        }
        // Coerce all rows
        for (var i = 0; i < rows.length; i++) {
          for (var j = 0; j < numericKeys.length; j++) {
            var k = numericKeys[j];
            var v = rows[i][k];
            if (typeof v === 'string') {
              var num = Number(v);
              rows[i][k] = isNaN(num) ? 0 : num;
            } else if (v == null || (typeof v === 'number' && isNaN(v))) {
              rows[i][k] = 0;
            }
          }
        }
        return rows;
      }

      // Listen for data from parent
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'dashship-data') {
          var rows = sanitizeRows(e.data.rows || []);
          console.log('[DashboardIframe] Received ' + rows.length + ' rows');
          if (rows.length > 0) console.log('[DashboardIframe] Sample row keys:', Object.keys(rows[0]));
          renderDashboard(rows);
          // Report height after render
          requestAnimationFrame(function() {
            var h = document.documentElement.scrollHeight;
            parent.postMessage({ type: 'dashship-resize', height: h }, '*');
          });
        }
      });

      // Observe size changes
      var ro = new ResizeObserver(function(entries) {
        var h = entries[0].contentRect.height;
        if (h > 0) parent.postMessage({ type: 'dashship-resize', height: h }, '*');
      });
      ro.observe(rootEl);

      // Signal ready
      parent.postMessage({ type: 'dashship-ready' }, '*');
    }
  } catch (err) {
    showError('Compilation error: ' + err.message + '\\n' + err.stack);
  }
}
<\/script>
</body>
</html>`
}

// ── Component ────────────────────────────────────────────────────

const DashboardIframe: FC<DashboardIframeProps> = ({
  jsxCode,
  data,
  className = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(800)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const srcdoc = useMemo(() => buildSrcdoc(jsxCode), [jsxCode])

  // Listen for messages from iframe
  const handleMessage = useCallback((e: MessageEvent) => {
    if (!e.data || typeof e.data !== 'object') return

    switch (e.data.type) {
      case 'dashship-ready':
        setReady(true)
        setError(null)
        break
      case 'dashship-resize':
        if (typeof e.data.height === 'number' && e.data.height > 0) {
          setIframeHeight(Math.max(e.data.height + 20, 200))
        }
        break
      case 'dashship-error':
        setError(e.data.message || 'Unknown error in dashboard component')
        break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Send data to iframe when ready or data changes
  useEffect(() => {
    if (ready && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'dashship-data', rows: data },
        '*'
      )
    }
  }, [ready, data])

  // Reset ready state when jsxCode changes (iframe reloads)
  useEffect(() => {
    setReady(false)
    setError(null)
  }, [jsxCode])

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      {error && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFF8F0',
            border: '1px solid #E8D5C0',
            marginBottom: 12,
            fontFamily: '"Space Grotesk", monospace',
            fontSize: 12,
            color: '#C1403D',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dashboard Error
          </span>
          <br />
          {error}
        </div>
      )}

      {!ready && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAF6',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: '"Space Grotesk", monospace',
              fontSize: 12,
              color: '#A19D94',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Rendering dashboard…
          </span>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: '100%',
          height: iframeHeight,
          border: 'none',
          display: 'block',
          backgroundColor: '#FFFFFF',
          transition: 'height 200ms ease',
        }}
        title="Dashboard"
      />
    </div>
  )
}

export default DashboardIframe
