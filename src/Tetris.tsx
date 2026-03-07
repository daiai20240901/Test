import { useState, useEffect, useCallback, useRef } from 'react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const TICK_INTERVAL = 800;

type Cell = number;
type Board = Cell[][];

const TETROMINOES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: '#00f0f0' }, // I
  { shape: [[1, 1], [1, 1]], color: '#f0f000' }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }, // L
];

const COLORS = ['', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];

function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  );
}

interface Piece {
  shape: number[][];
  color: string;
  colorIndex: number;
  x: number;
  y: number;
}

function randomPiece(): Piece {
  const idx = Math.floor(Math.random() * TETROMINOES.length);
  const t = TETROMINOES[idx];
  return {
    shape: t.shape,
    color: t.color,
    colorIndex: idx + 1,
    x: Math.floor((BOARD_WIDTH - t.shape[0].length) / 2),
    y: 0,
  };
}

function isValid(board: Board, piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function placePiece(board: Board, piece: Piece): Board {
  const next = board.map(row => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.y + r;
      const nx = piece.x + c;
      if (ny >= 0) next[ny][nx] = piece.colorIndex;
    }
  }
  return next;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const newBoard = board.filter(row => row.some(cell => cell === 0));
  const cleared = BOARD_HEIGHT - newBoard.length;
  const emptyRows = Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(0));
  return { board: [...emptyRows, ...newBoard], cleared };
}

const SCORE_TABLE = [0, 100, 300, 500, 800];

export default function Tetris() {
  const [board, setBoard] = useState<Board>(createBoard());
  const [piece, setPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece>(randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  boardRef.current = board;
  pieceRef.current = piece;

  const spawnPiece = useCallback((next: Piece, currentBoard: Board) => {
    if (!isValid(currentBoard, next)) {
      setGameOver(true);
      setPiece(null);
      return false;
    }
    setPiece(next);
    setNextPiece(randomPiece());
    return true;
  }, []);

  const lockPiece = useCallback((currentPiece: Piece, currentBoard: Board) => {
    const newBoard = placePiece(currentBoard, currentPiece);
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    setBoard(clearedBoard);
    setScore(prev => prev + SCORE_TABLE[cleared] * level);
    setLines(prev => {
      const newLines = prev + cleared;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });
    return clearedBoard;
  }, [level]);

  const moveDown = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;
    if (isValid(currentBoard, currentPiece, 0, 1)) {
      setPiece(p => p ? { ...p, y: p.y + 1 } : p);
    } else {
      const lockedBoard = lockPiece(currentPiece, currentBoard);
      spawnPiece(nextPiece, lockedBoard);
    }
  }, [lockPiece, spawnPiece, nextPiece]);

  // Game tick
  const nextPieceRef = useRef(nextPiece);
  nextPieceRef.current = nextPiece;
  const moveDownRef = useRef(moveDown);
  moveDownRef.current = moveDown;
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = Math.max(100, TICK_INTERVAL - (levelRef.current - 1) * 70);
    const timer = setInterval(() => {
      moveDownRef.current();
    }, interval);
    return () => clearInterval(timer);
  }, [started, gameOver, level]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!started || gameOver) return;
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (isValid(currentBoard, currentPiece, -1, 0))
          setPiece(p => p ? { ...p, x: p.x - 1 } : p);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (isValid(currentBoard, currentPiece, 1, 0))
          setPiece(p => p ? { ...p, x: p.x + 1 } : p);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveDownRef.current();
        break;
      case 'ArrowUp':
      case 'x':
      case 'X': {
        e.preventDefault();
        const rotated = rotate(currentPiece.shape);
        if (isValid(currentBoard, currentPiece, 0, 0, rotated))
          setPiece(p => p ? { ...p, shape: rotated } : p);
        else if (isValid(currentBoard, currentPiece, 1, 0, rotated))
          setPiece(p => p ? { ...p, shape: rotated, x: p.x + 1 } : p);
        else if (isValid(currentBoard, currentPiece, -1, 0, rotated))
          setPiece(p => p ? { ...p, shape: rotated, x: p.x - 1 } : p);
        break;
      }
      case ' ': {
        e.preventDefault();
        let dy = 0;
        while (isValid(currentBoard, currentPiece, 0, dy + 1)) dy++;
        const dropped = { ...currentPiece, y: currentPiece.y + dy };
        const lockedBoard = lockPiece(dropped, currentBoard);
        spawnPiece(nextPieceRef.current, lockedBoard);
        break;
      }
    }
  }, [started, gameOver, lockPiece, spawnPiece]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const startGame = () => {
    const newBoard = createBoard();
    const first = randomPiece();
    const next = randomPiece();
    setBoard(newBoard);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setNextPiece(next);
    setPiece(first);
    setStarted(true);
  };

  // Build display board (board + current piece)
  const displayBoard: Board = piece
    ? placePiece(board, piece)
    : board.map(row => [...row]);

  // Ghost piece
  let ghostPiece: Piece | null = null;
  if (piece) {
    let dy = 0;
    while (isValid(board, piece, 0, dy + 1)) dy++;
    ghostPiece = { ...piece, y: piece.y + dy };
  }

  const ghostBoard: boolean[][] = Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(false)
  );
  if (ghostPiece) {
    for (let r = 0; r < ghostPiece.shape.length; r++) {
      for (let c = 0; c < ghostPiece.shape[r].length; c++) {
        if (!ghostPiece.shape[r][c]) continue;
        const gy = ghostPiece.y + r;
        const gx = ghostPiece.x + c;
        if (gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
          ghostBoard[gy][gx] = true;
        }
      }
    }
  }

  // Next piece preview board (4x4)
  const previewSize = 4;
  const previewBoard: number[][] = Array.from({ length: previewSize }, () =>
    Array(previewSize).fill(0)
  );
  if (nextPiece) {
    const offsetR = Math.floor((previewSize - nextPiece.shape.length) / 2);
    const offsetC = Math.floor((previewSize - nextPiece.shape[0].length) / 2);
    for (let r = 0; r < nextPiece.shape.length; r++) {
      for (let c = 0; c < nextPiece.shape[r].length; c++) {
        if (nextPiece.shape[r][c]) {
          previewBoard[offsetR + r][offsetC + c] = nextPiece.colorIndex;
        }
      }
    }
  }

  const cellSize = 30;

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>TETRIS</h1>
      <div style={styles.container}>
        {/* Game Board */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              ...styles.board,
              width: BOARD_WIDTH * cellSize,
              height: BOARD_HEIGHT * cellSize,
            }}
          >
            {displayBoard.map((row, r) =>
              row.map((cell, c) => {
                const isGhost = !cell && ghostBoard[r][c];
                const color = cell ? COLORS[cell] : 'transparent';
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      ...styles.cell,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: isGhost ? 'rgba(255,255,255,0.15)' : color,
                      border: cell
                        ? `2px solid ${lighten(COLORS[cell])}`
                        : isGhost
                        ? '1px dashed rgba(255,255,255,0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                      boxSizing: 'border-box',
                      boxShadow: cell ? `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.4)` : 'none',
                    }}
                  />
                );
              })
            )}
          </div>
          {(!started || gameOver) && (
            <div style={styles.overlay}>
              {gameOver && <div style={styles.gameOverText}>GAME OVER</div>}
              {!started && !gameOver && <div style={styles.gameOverText}>TETRIS</div>}
              <button style={styles.button} onClick={startGame}>
                {gameOver ? 'もう一度' : 'スタート'}
              </button>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div style={styles.sidePanel}>
          <div style={styles.infoBox}>
            <div style={styles.label}>NEXT</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${previewSize}, 22px)`,
                gap: 1,
              }}
            >
              {previewBoard.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`p-${r}-${c}`}
                    style={{
                      width: 22,
                      height: 22,
                      backgroundColor: cell ? COLORS[cell] : 'rgba(255,255,255,0.05)',
                      border: cell ? `1px solid ${lighten(COLORS[cell])}` : '1px solid rgba(255,255,255,0.05)',
                      boxSizing: 'border-box',
                      boxShadow: cell ? `inset 1px 1px 3px rgba(255,255,255,0.3)` : 'none',
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.label}>SCORE</div>
            <div style={styles.value}>{score.toLocaleString()}</div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.label}>LINES</div>
            <div style={styles.value}>{lines}</div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.label}>LEVEL</div>
            <div style={styles.value}>{level}</div>
          </div>

          <div style={styles.controlsBox}>
            <div style={styles.label}>CONTROLS</div>
            <div style={styles.controlItem}>← → 移動</div>
            <div style={styles.controlItem}>↑ / X 回転</div>
            <div style={styles.controlItem}>↓ 下移動</div>
            <div style={styles.controlItem}>SPACE ドロップ</div>
          </div>

          {started && !gameOver && (
            <button style={{ ...styles.button, marginTop: 16 }} onClick={startGame}>
              リスタート
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function lighten(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, r + 80);
    const lg = Math.min(255, g + 80);
    const lb = Math.min(255, b + 80);
    return `rgb(${lr},${lg},${lb})`;
  } catch {
    return hex;
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '"Courier New", Courier, monospace',
  },
  title: {
    color: '#00f0f0',
    fontSize: '2.5rem',
    letterSpacing: '0.3em',
    marginBottom: '20px',
    textShadow: '0 0 20px #00f0f0, 0 0 40px #00f0f0',
    fontWeight: 'bold',
  },
  container: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
    backgroundColor: '#0d0d1a',
    border: '2px solid rgba(0,240,240,0.4)',
    boxShadow: '0 0 30px rgba(0,240,240,0.2)',
    position: 'relative',
  },
  cell: {
    transition: 'background-color 0.05s',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  gameOverText: {
    color: '#f00000',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
    textShadow: '0 0 20px #f00000',
  },
  button: {
    padding: '12px 28px',
    backgroundColor: '#00f0f0',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: '"Courier New", Courier, monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    boxShadow: '0 0 15px rgba(0,240,240,0.5)',
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '140px',
  },
  infoBox: {
    backgroundColor: '#0d0d1a',
    border: '1px solid rgba(0,240,240,0.3)',
    borderRadius: '4px',
    padding: '10px',
  },
  label: {
    color: '#00f0f0',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    marginBottom: '6px',
    opacity: 0.8,
  },
  value: {
    color: '#ffffff',
    fontSize: '1.4rem',
    fontWeight: 'bold',
  },
  controlsBox: {
    backgroundColor: '#0d0d1a',
    border: '1px solid rgba(0,240,240,0.3)',
    borderRadius: '4px',
    padding: '10px',
  },
  controlItem: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.72rem',
    marginBottom: '3px',
    letterSpacing: '0.05em',
  },
};
