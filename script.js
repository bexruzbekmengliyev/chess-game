const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

let board = [];
let selectedSquare = null;
let currentTurn = 'white';
let gameMode = 'human';
let aiDepth = 2;
let gameOver = false;
let capturedWhite = [];
let capturedBlack = [];
let lastMove = null;

const initialBoard = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

function initGame() {
  board = initialBoard.map(row => [...row]);
  selectedSquare = null; currentTurn = 'white'; gameOver = false;
  capturedWhite = []; capturedBlack = []; lastMove = null;
  updateStatus(); renderBoard();
}

function renderBoard() {
  const boardEl = document.getElementById('chessboard');
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.row = r; sq.dataset.col = c;
      if (board[r][c]) sq.textContent = PIECES[board[r][c]];
      if (lastMove && ((r === lastMove.from.r && c === lastMove.from.c) || (r === lastMove.to.r && c === lastMove.to.c))) {
        sq.classList.add('last-move');
      }
      sq.addEventListener('click', () => handleSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

function handleSquareClick(r, c) {
  if (gameOver || (gameMode === 'ai' && currentTurn !== 'white')) return;
  const piece = board[r][c];
  if (selectedSquare) {
    const moves = getValidMoves(selectedSquare.r, selectedSquare.c);
    const isValid = moves.some(m => m.r === r && m.c === c);
    if (isValid) {
      makeMove(selectedSquare.r, selectedSquare.c, r, c);
      selectedSquare = null;
      if (gameMode === 'ai' && !gameOver) setTimeout(aiMove, 500);
    } else {
      selectedSquare = (piece && piece.startsWith(currentTurn[0].toUpperCase())) ? {r, c} : null;
    }
  } else {
    if (piece && piece.startsWith(currentTurn[0].toUpperCase())) selectedSquare = {r, c};
  }
  updateHighlights();
}

function getValidMoves(r, c) {
  const piece = board[r][c]; if (!piece) return [];
  const type = piece[1]; const color = piece[0]; const moves = [];
  const addMove = (nr, nc) => {
    if (nr<0||nr>7||nc<0||nc>7) return false;
    const target = board[nr][nc];
    if (!target) { moves.push({r:nr,c:nc}); return true; }
    if (target[0]!==color) { moves.push({r:nr,c:nc}); return false; }
    return false;
  };
  const dir = color==='w' ? -1 : 1;
  switch(type) {
    case 'P':
      if(!board[r+dir]?.[c]) moves.push({r:r+dir,c:c});
      if((color==='w'&&r===6)||(color==='b'&&r===1)) if(!board[r+dir*2][c]) moves.push({r:r+dir*2,c:c});
      [-1,1].forEach(dc => { const nr=r+dir,nc=c+dc; if(nr>=0&&nr<=7&&nc>=0&&nc<=7&&board[nr][nc]?.[0]!==color) moves.push({r:nr,c:nc}); });
      break;
    case 'R': [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!addMove(r+dr*i,c+dc*i)) break;}); break;
    case 'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>addMove(r+dr,c+dc)); break;
    case 'B': [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!addMove(r+dr*i,c+dc*i)) break;}); break;
    case 'Q': [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!addMove(r+dr*i,c+dc*i)) break;}); break;
    case 'K': [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>addMove(r+dr,c+dc)); break;
  }
  return moves.filter(m => !wouldBeCheck(r,c,m.r,m.c,color));
}

function wouldBeCheck(fR,fC,tR,tC,color) {
  const saved = board[tR][tC]; board[tR][tC] = board[fR][fC]; board[fR][fC] = null;
  const check = isKingInCheck(color); board[fR][fC] = board[tR][tC]; board[tR][tC] = saved; return check;
}

function isKingInCheck(color) {
  let king = null; for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===(color==='w'?'wK':'bK')) king={r,c};
  if(!king) return false; const enemy=color==='w'?'b':'w';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]?.startsWith(enemy)) if(getRawMoves(r,c).some(m=>m.r===king.r&&m.c===king.c)) return true;
  return false;
}

function getRawMoves(r,c) { /* Simplified for check detection */ 
  const p=board[r][c]; if(!p) return []; const type=p[1]; const col=p[0]; const m=[];
  const add=(nr,nc)=>{if(nr<0||nr>7||nc<0||nc>7)return false; const t=board[nr][nc]; if(!t){m.push({r:nr,c:nc});return true;} if(t[0]!==col){m.push({r:nr,c:nc});return false;} return false;};
  const d=col==='w'?-1:1;
  if(type==='P'){if(!board[r+d]?.[c]) m.push({r:r+d,c:c});[-1,1].forEach(dc=>{const nr=r+d,nc=c+dc;if(nr>=0&&nr<=7&&nc>=0&&nc<=7&&board[nr][nc]?.[0]!==col)m.push({r:nr,c:nc});});}
  if(type==='R')[[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!add(r+dr*i,c+dc*i)) break;});
  if(type==='N')[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  if(type==='B')[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!add(r+dr*i,c+dc*i)) break;});
  if(type==='Q')[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++) if(!add(r+dr*i,c+dc*i)) break;});
  if(type==='K')[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  return m;
}

function makeMove(fR,fC,tR,tC) {
  const piece=board[fR][fC], cap=board[tR][tC]; board[tR][tC]=piece; board[fR][fC]=null;
  lastMove={from:{r:fR,c:fC},to:{r:tR,c:tC}};
  if(cap){ cap.startsWith('w')?capturedWhite.push(cap):capturedBlack.push(cap); updateCaptured(); }
  if(piece[1]==='P'&&(tR===0||tR===7)) board[tR][tC]=piece[0]+'Q';
  currentTurn=currentTurn==='white'?'black':'white'; updateStatus(); renderBoard();
  if(isCheckmate(currentTurn)){gameOver=true; document.getElementById('game-status').textContent=`🏆 ${currentTurn==='white'?'Qora':'Oq'} yutdi!`;}
  else if(isStalemate(currentTurn)){gameOver=true; document.getElementById('game-status').textContent='⚖️ Durang!';}
}

function isCheckmate(c){ return isKingInCheck(c) && !hasAnyLegalMove(c); }
function isStalemate(c){ return !isKingInCheck(c) && !hasAnyLegalMove(c); }
function hasAnyLegalMove(c){ for(let r=0;r<8;r++) for(let col=0;col<8;col++) if(board[r][col]?.startsWith(c==='w'?'w':'b') && getValidMoves(r,col).length>0) return true; return false; }

function aiMove() {
  const c=currentTurn==='white'?'b':'w'; let best=null, bestS=-Infinity; const moves=getAllMoves(c);
  for(const mv of moves){
    const s=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=board[mv.from.r][mv.from.c]; board[mv.from.r][mv.from.c]=null;
    const sc=-minimax(aiDepth-1,-Infinity,Infinity,c==='w'?'b':'w');
    board[mv.from.r][mv.from.c]=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=s;
    if(sc>bestS){bestS=sc;best=mv;}
  }
  if(best) makeMove(best.from.r,best.from.c,best.to.r,best.to.c);
}

function getAllMoves(c){ const m=[]; for(let r=0;r<8;r++) for(let col=0;col<8;col++) if(board[r][col]?.startsWith(c)) getValidMoves(r,col).forEach(mv=>m.push({from:{r,col:c},to:mv})); return m; }

function minimax(d,a,b,isMax){
  if(d===0) return evaluateBoard();
  const c=isMax?'w':'b'; const moves=getAllMoves(c);
  if(moves.length===0) return isKingInCheck(c)?-1000:0;
  if(isMax){let mx=-Infinity; for(const mv of moves){const s=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=board[mv.from.r][mv.from.c]; board[mv.from.r][mv.from.c]=null; const v=minimax(d-1,a,b,false); board[mv.from.r][mv.from.c]=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=s; mx=Math.max(mx,v); a=Math.max(a,v); if(b<=a) break;} return mx;}
  else{let mn=Infinity; for(const mv of moves){const s=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=board[mv.from.r][mv.from.c]; board[mv.from.r][mv.from.c]=null; const v=minimax(d-1,a,b,true); board[mv.from.r][mv.from.c]=board[mv.to.r][mv.to.c]; board[mv.to.r][mv.to.c]=s; mn=Math.min(mn,v); b=Math.min(b,v); if(b<=a) break;} return mn;}
}

function evaluateBoard(){
  const v={P:1,N:3,B:3,R:5,Q:9,K:0}; let s=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]) s+=board[r][c].startsWith('w')?v[board[r][c][1]]:-v[board[r][c][1]];
  return s;
}

function updateHighlights(){
  document.querySelectorAll('.square').forEach(sq=>sq.classList.remove('selected','valid-move'));
  if(selectedSquare){
    document.querySelector(`.square[data-row="${selectedSquare.r}"][data-col="${selectedSquare.c}"]`)?.classList.add('selected');
    getValidMoves(selectedSquare.r,selectedSquare.c).forEach(m=>document.querySelector(`.square[data-row="${m.r}"][data-col="${m.c}"]`)?.classList.add('valid-move'));
  }
}
function updateStatus(){ document.getElementById('turn-indicator').textContent=currentTurn==='white'?'⚪ Oq navbat':'⚫ Qora navbat'; }
function updateCaptured(){ document.getElementById('captured-white').textContent=capturedWhite.map(p=>PIECES[p]).join(' '); document.getElementById('captured-black').textContent=capturedBlack.map(p=>PIECES[p]).join(' '); }

document.addEventListener('DOMContentLoaded', () => {
  const s=document.getElementById('splash'), m=document.getElementById('menu'), g=document.getElementById('game');
  document.getElementById('startBtn').addEventListener('click',()=>{s.classList.add('hidden');setTimeout(()=>m.classList.remove('hidden'),600);});
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>{gameMode=btn.dataset.mode;if(gameMode==='ai')document.getElementById('ai-difficulty').classList.remove('hidden');else startGame();}));
  document.querySelectorAll('.diff-btn').forEach(btn=>btn.addEventListener('click',()=>{aiDepth=parseInt(btn.dataset.diff);startGame();}));
  function startGame(){m.classList.add('hidden');setTimeout(()=>{g.classList.remove('hidden');initGame();},600);}
  document.getElementById('backBtn').addEventListener('click',()=>{g.classList.add('hidden');setTimeout(()=>m.classList.remove('hidden'),600);});
});