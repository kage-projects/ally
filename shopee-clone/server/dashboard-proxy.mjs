import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

export function isDashboardPath(url = '') {
  const path = url.split('?')[0];
  return path === '/dashboard' || path.startsWith('/dashboard/') ||
    path.startsWith('/_next/') || path === '/api/ally/evaluation' ||
    path === '/api/ally/evaluation/results';
}

function dashboardUpstream(req, origin) {
  const upstream = new URL(typeof origin === 'function' ? origin() : origin);
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password ||
      upstream.pathname !== '/' || upstream.search || upstream.hash) throw Error('Invalid dashboard origin');
  if (['localhost', '127.0.0.1', '[::1]'].includes(upstream.hostname) &&
      Number(upstream.port || (upstream.protocol === 'https:' ? 443 : 80)) === req.socket.localPort) {
    throw Error('Dashboard origin points to host');
  }
  return upstream;
}

// Serve Next on the host origin: BroadcastChannel cannot cross ports/origins.
// The upstream is server configuration, never supplied by a browser request.
export function createDashboardProxy({ origin = () => process.env.ALLY_DASHBOARD_ORIGIN || 'http://127.0.0.1:3000', timeoutMs = 30000 } = {}) {
  return function proxy(req, res) {
    if (!isDashboardPath(req.url)) return false;
    const unavailable = () => {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('Dashboard belum tersedia. Jalankan dashboard di port 3000, lalu buka /dashboard melalui server Shopee. Atur ALLY_DASHBOARD_ORIGIN jika port dashboard berbeda.');
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { allow: 'GET, HEAD' }); res.end(); return true;
    }
    let upstream;
    try {
      upstream = dashboardUpstream(req, origin);
    } catch { unavailable(); return true; }
    const headers = { 'x-ally-dashboard-proxy': '1' };
    for (const name of ['accept', 'accept-encoding', 'accept-language', 'content-type', 'rsc',
      'next-router-state-tree', 'next-router-prefetch', 'next-url', 'if-none-match', 'if-modified-since']) {
      if (req.headers[name] !== undefined) headers[name] = req.headers[name];
    }
    const request = (upstream.protocol === 'https:' ? httpsRequest : httpRequest)({
      protocol: upstream.protocol, hostname: upstream.hostname, port: upstream.port,
      method: req.method, path: req.url, headers,
    }, response => {
      const responseHeaders = { ...response.headers };
      for (const name of ['connection', 'keep-alive', 'transfer-encoding', 'set-cookie']) delete responseHeaders[name];
      if (responseHeaders.location?.startsWith(upstream.origin + '/')) {
        responseHeaders.location = responseHeaders.location.slice(upstream.origin.length);
      }
      res.writeHead(response.statusCode || 502, responseHeaders);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    request.setTimeout(timeoutMs, () => request.destroy());
    request.on('error', unavailable);
    res.once('close', () => request.destroy());
    request.end();
    return true;
  };
}

// Next dev HMR uses a WebSocket; ordinary HTTP proxying would return a 404.
export function createDashboardUpgradeProxy({ origin = () => process.env.ALLY_DASHBOARD_ORIGIN || 'http://127.0.0.1:3000' } = {}) {
  return (req, socket, head) => {
    if (req.url?.split('?')[0] !== '/_next/webpack-hmr') return false;
    let upstream;
    try { upstream = dashboardUpstream(req, origin); }
    catch { socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return true; }
    const headers = { connection: 'Upgrade', upgrade: 'websocket' };
    for (const name of ['sec-websocket-key', 'sec-websocket-version', 'sec-websocket-protocol', 'sec-websocket-extensions', 'origin']) {
      if (req.headers[name] !== undefined) headers[name] = req.headers[name];
    }
    const request = (upstream.protocol === 'https:' ? httpsRequest : httpRequest)({
      protocol: upstream.protocol, hostname: upstream.hostname, port: upstream.port,
      path: req.url, method: 'GET', headers,
    });
    let upstreamSocket;
    request.once('upgrade', (response, connected, upstreamHead) => {
      upstreamSocket = connected;
      connected.setTimeout(0);
      const lines = ['HTTP/1.1 101 Switching Protocols'];
      for (const [name, value] of Object.entries(response.headers)) {
        if (name !== 'set-cookie') lines.push(`${name}: ${value}`);
      }
      socket.write(lines.join('\r\n') + '\r\n\r\n');
      if (head.length) connected.write(head);
      if (upstreamHead.length) socket.write(upstreamHead);
      connected.on('error', () => socket.destroy());
      connected.on('close', () => socket.destroy());
      connected.pipe(socket); socket.pipe(connected);
    });
    request.once('response', response => { response.resume(); socket.destroy(); });
    request.once('error', () => socket.destroy());
    request.setTimeout(10000, () => request.destroy());
    socket.once('close', () => { request.destroy(); upstreamSocket?.destroy(); });
    socket.once('error', () => { request.destroy(); upstreamSocket?.destroy(); });
    request.end();
    return true;
  };
}
