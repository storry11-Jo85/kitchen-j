const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dataFile = path.join(root, 'kitchen-log-data.json');
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const defaults = { entries:{}, descriptions:{ A1:'메인 메뉴 조리', A2:'재료 및 식기 준비', B1:'식재료 세척·손질', B2:'소스·양념 준비', C1:'테이블 세팅', C2:'조리도구 세척', D1:'냉장고 정리·확인', D2:'식자재 입고·정리', E1:'마감 청소', E2:'분리수거 및 폐기', F1:'마감 상태 점검', F2:'특이사항 및 이슈' } };
function readData() { try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return defaults; } }
function writeData(body) { fs.writeFileSync(dataFile, JSON.stringify(body, null, 2), 'utf8'); }
function send(res, code, body, type='application/json; charset=utf-8') { res.writeHead(code, {'Content-Type':type, 'Cache-Control':'no-store'}); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); }
http.createServer((req, res) => {
  if (req.url === '/api/state' && req.method === 'GET') return send(res, 200, readData());
  if (req.url === '/api/state' && req.method === 'POST') {
    let raw=''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { const data=JSON.parse(raw); if (!data || typeof data !== 'object') throw Error(); writeData({entries:data.entries||{}, descriptions:data.descriptions||defaults.descriptions}); send(res,200,{ok:true}); } catch { send(res,400,{ok:false}); } }); return;
  }
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0]; const file = path.normalize(path.join(root, requested));
  if (!file.startsWith(root)) return send(res, 403, {error:'forbidden'});
  fs.readFile(file, (err, content) => err ? send(res,404,{error:'not found'}) : send(res,200,content,mime[path.extname(file)] || 'application/octet-stream'));
}).listen(port, '0.0.0.0', () => console.log(`주방 작업 일지: http://localhost:${port}`));
