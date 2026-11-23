import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const p = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (p !== root && !p.startsWith(root + sep)) { res.writeHead(403);res.end('Forbidden');return; }
    const info = await stat(p);
    if (!info.isFile()) throw new Error('Not a file');
    const content = await readFile(p);
    res.writeHead(200,{'Content-Type': types[extname(p)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);
  } catch {res.writeHead(404);res.end('No encontrado');}
}).listen(port, '127.0.0.1',()=>console.log(`Ojo al Hueco disponible en http://localhost:${port}`));
