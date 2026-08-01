// M1: escape user-controlled values for safe interpolation into HTML and into
// a JS string literal (the error page embeds the name in a <script>).
function esc(value: string): string {
  return String(value).replace(/[&<>"'`\\/]/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      case '`': return '&#96;';
      case '\\': return '\\\\';
      case '/': return '&#47;';
      default: return ch;
    }
  });
}

export function getNoServiceHtml(webUrl: string): string {
  const safeUrl = esc(webUrl);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Passerelle Daemon</title><style>body { font-family: system-ui, sans-serif; background-color: #09090b; color: #fafafa; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 1rem; } .card { background: #121215; border: 1px solid #27272a; border-radius: 0.75rem; padding: 2rem; max-width: 400px; width: 100%; text-align: center; } h1 { font-size: 1.5rem; margin-bottom: 0.5rem; } p { color: #a1a1aa; font-size: 0.9rem; margin-bottom: 1.5rem; } .btn { display: inline-block; width: 100%; padding: 0.75rem 0; border-radius: 0.5rem; background: #fafafa; color: #09090b; font-size: 0.9rem; font-weight: 600; text-decoration: none; }</style></head><body><div class="card"><h1>Passerelle Daemon</h1><p>Aucun service n'est actuellement démarré sur cet ordinateur.</p><a href="${safeUrl}" class="btn">Ouvrir l'application mobile</a></div></body></html>`;
}

export function getErrorPageHtml(serviceName: string, targetUrl: string): string {
  const name = esc(serviceName);
  const url = esc(targetUrl);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Service Inaccessible | Passerelle</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
  .container { max-width: 900px; width: 100%; padding: 2rem; box-sizing: border-box; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; color: #09090b; }
  .subtitle { color: #52525b; font-size: 1.1rem; margin-bottom: 3rem; }
  .network-map { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4rem; position: relative; flex-wrap: wrap; gap: 1rem; }
  @media (max-width: 768px) { .network-map { flex-direction: column; align-items: stretch; gap: 2rem; } }
  .node { display: flex; flex-direction: column; align-items: center; z-index: 2; flex: 1; min-width: 120px; text-align: center; }
  @media (max-width: 768px) { .node { flex-direction: row; justify-content: flex-start; text-align: left; gap: 1rem; } }
  .icon-container { width: 64px; height: 64px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 1rem; border: 2px solid #e4e4e7; position: relative; }
  @media (max-width: 768px) { .icon-container { margin-bottom: 0; flex-shrink: 0; } }
  .icon-container svg { width: 32px; height: 32px; color: #52525b; }
  .status-badge { position: absolute; bottom: -4px; right: -4px; width: 22px; height: 22px; border-radius: 50%; background: #22c55e; border: 3px solid white; display: flex; align-items: center; justify-content: center; }
  .status-badge.error { background: #ef4444; }
  .status-badge svg { width: 12px; height: 12px; color: white; }
  .node-title { font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem; }
  .node-status { font-size: 0.85rem; color: #22c55e; font-weight: 500; }
  .node-status.error { color: #ef4444; }
  @media (max-width: 768px) { .node-info { display: flex; flex-direction: column; } }
  .connector { flex: 1; height: 2px; background: #22c55e; margin: 0 1rem; transform: translateY(-1.5rem); position: relative; min-width: 30px; }
  .connector.error { background: transparent; border-top: 2px dashed #ef4444; box-sizing: border-box; display: flex; justify-content: center; align-items: center; }
  .connector-x { background: #f4f4f5; padding: 0 6px; color: #ef4444; font-weight: bold; font-size: 1.1rem; line-height: 1; display: flex; align-items: center; justify-content: center; }
  @media (max-width: 768px) { .connector { width: 2px; height: 2rem; transform: none; margin: -1rem 0 -1rem 31px; min-width: auto; } .connector.error { border-top: none; border-left: 2px dashed #ef4444; } .connector-x { display: none; } }
  .info-box { background: white; border: 1px solid #e4e4e7; border-radius: 0.75rem; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
  .info-title { font-size: 1.1rem; font-weight: 600; margin: 0; color: #18181b; }
  .info-text { margin: 0; color: #52525b; line-height: 1.6; }
  .info-url { font-family: monospace; background: #f4f4f5; padding: 0.5rem 1rem; border-radius: 0.5rem; color: #09090b; font-size: 0.9rem; word-break: break-all; border: 1px solid #e4e4e7; }
  @media (prefers-color-scheme: dark) {
    body { background-color: #09090b; color: #fafafa; } h1, .info-title { color: #fafafa; } .subtitle, .info-text { color: #a1a1aa; }
    .icon-container { background: #18181b; border-color: #27272a; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); } .icon-container svg { color: #a1a1aa; }
    .status-badge { border-color: #09090b; } .connector-x { background: #09090b; } .info-box { background: #18181b; border-color: #27272a; } .info-url { background: #000; border-color: #27272a; color: #a78bfa; }
  }
</style>
</head><body>
<div class="container">
  <h1 id="page-title">Service Injoignable</h1>
  <p class="subtitle" id="page-subtitle">Le serveur distant a refusé la connexion ou n'a pas répondu à temps.</p>
  <div class="network-map">
    <div class="node"><div class="icon-container"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg><div class="status-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div><div class="node-info"><div class="node-title" id="node-browser">Votre Navigateur</div><div class="node-status" id="status-working-1">Opérationnel</div></div></div>
    <div class="connector"></div>
    <div class="node"><div class="icon-container"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg><div class="status-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div><div class="node-info"><div class="node-title">Passerelle Cloud</div><div class="node-status" id="status-working-2">Opérationnel</div></div></div>
    <div class="connector"></div>
    <div class="node"><div class="icon-container"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg><div class="status-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div><div class="node-info"><div class="node-title">Passerelle Daemon</div><div class="node-status" id="status-working-3">Opérationnel</div></div></div>
    <div class="connector error"><div class="connector-x">✕</div></div>
    <div class="node"><div class="icon-container" style="border-color: #ef4444;"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><div class="status-badge error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div></div><div class="node-info"><div class="node-title">${name}</div><div class="node-status error" id="status-error">Injoignable</div></div></div>
  </div>
  <div class="info-box">
    <div class="info-section"><h2 class="info-title" id="info-title-1">Que s'est-il passé ?</h2><p class="info-text" id="info-text-1">Le Daemon Passerelle (ce qui est lancé sur l'appareil dans votre réseau local) n'arrive pas à se connecter au service <strong>${name}</strong> depuis ce réseau local.</p></div>
    <div class="info-section"><h2 class="info-title" id="info-title-2">Que puis-je faire ?</h2><p class="info-text" id="info-text-2">Rendez-vous sur votre administration Passerelle et modifiez l'IP, le port ou assurez-vous que l'application est bien lancée et opérationnelle.</p></div>
    <div class="info-url">${url}</div>
  </div>
</div>
<script>
  // The service name is rendered server-side (escaped); the English fallback
  // reads it back from the DOM via textContent to avoid embedding user data in JS.
  var lang = navigator.language || navigator.userLanguage;
  if (!lang.startsWith('fr')) {
    var svc = document.getElementById('status-error').parentElement.querySelector('.node-title').textContent;
    document.getElementById('page-title').textContent = 'Service Unreachable';
    document.getElementById('page-subtitle').textContent = 'The remote server refused the connection or took too long to respond.';
    document.getElementById('node-browser').textContent = 'Your Browser';
    document.getElementById('status-working-1').textContent = 'Working'; document.getElementById('status-working-2').textContent = 'Working'; document.getElementById('status-working-3').textContent = 'Working'; document.getElementById('status-error').textContent = 'Unreachable';
    document.getElementById('info-title-1').textContent = 'What happened?';
    document.getElementById('info-text-1').textContent = 'The Passerelle Daemon is unable to connect to the ' + svc + ' service.';
    document.getElementById('info-title-2').textContent = 'What can I do?';
    document.getElementById('info-text-2').textContent = 'Go to your Passerelle dashboard and change the IP address, the port, or ensure that the application is running and operational.';
  }
</script>
</body></html>`;
}
