import { useState } from 'react';
import { Delete } from 'lucide-react';

interface Props {
  onResult: (value: number) => void;
  onClose: () => void;
}

export function Calculator({ onResult, onClose: _onClose }: Props) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const press = (n: string) => {
    if (reset) { setDisplay(n); setReset(false); return; }
    setDisplay((d) => (d === '0' && n !== '.') ? n : d + n);
  };

  const handleOp = (o: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op) {
      const result = calc(prev, cur, op);
      setDisplay(String(result));
      setPrev(result);
    } else {
      setPrev(cur);
    }
    setOp(o);
    setReset(true);
  };

  const calc = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const equals = () => {
    const cur = parseFloat(display);
    if (prev !== null && op) {
      const result = calc(prev, cur, op);
      setDisplay(String(result));
      setPrev(null);
      setOp(null);
      setReset(true);
    }
  };

  const clear = () => {
    setDisplay('0'); setPrev(null); setOp(null); setReset(false);
  };

  const backspace = () => {
    setDisplay((d) => d.length > 1 ? d.slice(0, -1) : '0');
  };

  return (
    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 w-full max-w-[260px]">
      {/* Display */}
      <div className="mb-2 px-3 py-3 rounded-lg bg-slate-950 text-right">
        <span className="text-2xl font-mono font-bold text-slate-100">{display}</span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <button onClick={clear}
          className="p-2.5 rounded-lg text-sm font-semibold bg-rose-900/40 text-rose-300 hover:bg-rose-800/50 transition-colors">C</button>
        <button onClick={backspace}
          className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
          <Delete size={14} className="mx-auto" />
        </button>
        <button onClick={() => press('%')}
          className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">%</button>
        <button onClick={() => handleOp('÷')}
          className={`p-2.5 rounded-lg text-sm font-semibold transition-colors ${op === '÷' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50'}`}>÷</button>

        {/* Row 2 */}
        {['7','8','9'].map((n) => (
          <button key={n} onClick={() => press(n)}
            className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp('×')}
          className={`p-2.5 rounded-lg text-sm font-semibold transition-colors ${op === '×' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50'}`}>×</button>

        {/* Row 3 */}
        {['4','5','6'].map((n) => (
          <button key={n} onClick={() => press(n)}
            className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp('-')}
          className={`p-2.5 rounded-lg text-sm font-semibold transition-colors ${op === '-' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50'}`}>-</button>

        {/* Row 4 */}
        {['1','2','3'].map((n) => (
          <button key={n} onClick={() => press(n)}
            className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp('+')}
          className={`p-2.5 rounded-lg text-sm font-semibold transition-colors ${op === '+' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50'}`}>+</button>

        {/* Row 5 */}
        <button onClick={() => press('0')}
          className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors col-span-2">0</button>
        <button onClick={() => press('.')}
          className="p-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">,</button>
        <button onClick={equals}
          className="p-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">=</button>
      </div>

      {/* Use result */}
      <button onClick={() => { const v = parseFloat(display); if (!isNaN(v)) onResult(v); }}
        className="w-full mt-2 py-2 rounded-lg text-xs font-semibold bg-emerald-700/50 text-emerald-300 hover:bg-emerald-600/50 transition-colors">
        Usar resultado
      </button>
    </div>
  );
}
