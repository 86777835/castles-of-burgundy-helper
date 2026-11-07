// 勃艮第城堡助手 · Worker: room creation, lobby list, archive of finished games, rules assistant.
import {DurableObject} from 'cloudflare:workers';
import {initialState, reduce, gameRecord} from '../public/logic.js';
import {chat} from './chat.js';

const lobby = env => env.LOBBY.get(env.LOBBY.idFromName('lobby'));
const archive = env => env.ARCHIVE.get(env.ARCHIVE.idFromName('archive'));
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/api/chat' && req.method === 'POST') return chat(req, env);
    if (u.pathname === '/api/chat-log') {
      // The page reports a dropped chat connection here; it is only logged.
      if (req.method === 'POST') console.log('chat client error', (await req.text()).slice(0, 300));
      return new Response(null, {status: 204});
    }
    if (u.pathname === '/api/room' && req.method === 'POST') {
      for (let i = 0; i < 6; i++) {
        const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), n => CODE_CHARS[n % CODE_CHARS.length]).join('');
        const res = await env.ROOM.get(env.ROOM.idFromName(code)).fetch('https://room/init', {method: 'POST', body: code});
        if (res.ok) return Response.json({code});
      }
      return Response.json({error: '建房失败，请重试'}, {status: 503});
    }
    if (u.pathname === '/api/rooms') return lobby(env).fetch('https://lobby/list');
    if (u.pathname === '/api/games') return archive(env).fetch('https://archive/list' + u.search);
    const m = u.pathname.match(/^\/api\/room\/([A-Z0-9]{4})\/ws$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('需要 WebSocket', {status: 426});
      return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
    }
    return new Response('Not found', {status: 404});
  }
};

// Rooms seen in the last 7 days, newest first (landing page list).
export class Lobby extends DurableObject {
  async fetch(req) {
    const rooms = await this.ctx.storage.get('rooms') || {};
    if (req.method === 'POST') { const r = await req.json(); rooms[r.code] = {...r, updated: Date.now()}; }
    for (const [k, r] of Object.entries(rooms)) if (Date.now() - r.updated > 7 * 86400000) delete rooms[k];
    await this.ctx.storage.put('rooms', rooms);
    return Response.json(Object.values(rooms).sort((a, b) => b.updated - a.updated).slice(0, 30));
  }
}

// Finished games. A revised game is stored again under the same gid.
export class Archive extends DurableObject {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/put') { const r = await req.json(); await this.ctx.storage.put('g:' + r.gid, r); return new Response('ok'); }
    if (u.pathname === '/del') { await this.ctx.storage.delete('g:' + await req.text()); return new Response('ok'); }
    const rows = Array.from((await this.ctx.storage.list({prefix: 'g:', reverse: true, limit: 1000})).values());
    const q = (u.searchParams.get('q') || '').toLowerCase(), ed = u.searchParams.get('ed'), mode = u.searchParams.get('mode'), n = u.searchParams.get('n');
    const hit = r => (!ed || r.config.ed === ed) && (!mode || r.mode === mode) && (!n || String(r.config.n) === n)
      && (!q || r.code.toLowerCase().includes(q) || r.results.some(x => (x.name + ' ' + x.boards).toLowerCase().includes(q)));
    return Response.json(rows.filter(hit).sort((a, b) => b.ended - a.ended));
  }
}

// One room: authoritative state, synced to every phone over WebSocket.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => { this.s = await ctx.storage.get('s'); this.code = await ctx.storage.get('code'); });
  }
  async fetch(req) {
    if (new URL(req.url).pathname === '/init') {
      if (this.s) return new Response('exists', {status: 409});
      this.s = initialState(); this.code = await req.text();
      await this.ctx.storage.put({s: this.s, code: this.code});
      await this.report();
      return new Response('ok');
    }
    const actor = new URL(req.url).searchParams.get('actor');
    if (!/^[a-zA-Z0-9-]{12,80}$/.test(actor || '')) return new Response('身份无效', {status: 400});
    const [client, ws] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(ws);
    ws.serializeAttachment({actor});
    ws.send(JSON.stringify(this.s ? {type: 'state', state: this.view(ws)} : {type: 'error', error: '房间不存在'}));
    return new Response(null, {status: 101, webSocket: client});
  }
  // The host token never leaves the server; each phone only learns whether it is the host.
  view(ws) {
    const {host, prev, ...rest} = this.s;
    return {...rest, prev: !!prev, hasHost: !!host, isHost: host === ws.deserializeAttachment().actor};
  }
  async webSocketMessage(ws, msg) {
    if (!this.s || typeof msg !== 'string' || msg.length > 12000) return;
    try {
      const {action, revision} = JSON.parse(msg), actor = ws.deserializeAttachment().actor;
      if (revision !== this.s.revision) throw Error('房间刚有更新，请看一眼再点');
      const before = this.s;
      this.s = reduce(this.s, action, actor);
      await this.ctx.storage.put('s', this.s);
      for (const w of this.ctx.getWebSockets()) w.send(JSON.stringify({type: 'state', state: this.view(w)}));
      if (this.s.stage === 'over') await archive(this.env).fetch('https://archive/put', {method: 'POST', body: JSON.stringify({...gameRecord(this.s), code: this.code})});
      else if (before.stage === 'over') await archive(this.env).fetch('https://archive/del', {method: 'POST', body: before.gid});
      await this.report();
    } catch (e) {
      ws.send(JSON.stringify({type: 'error', error: e.message}));
      ws.send(JSON.stringify({type: 'state', state: this.view(ws)}));
    }
  }
  async report() {
    const s = this.s;
    await lobby(this.env).fetch('https://lobby/update', {method: 'POST', body: JSON.stringify({code: this.code, stage: s.stage, phase: s.phase, config: s.config, players: s.players.slice(0, s.config.n).map(p => p.name)})});
  }
  async webSocketClose(ws, code) { ws.close(code, 'closed'); }
}
