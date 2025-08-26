'use client';

import { useState } from 'react';
import { Question } from './questions';

export function NumberInput({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (val: number) => void;
}) {
  const [val, setVal] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const num = Number(val);
    if (val === '' || Number.isNaN(num)) return;
    if (question.min !== undefined && num < question.min) {
      setError(`${question.min} 이상 입력해 주세요.`);
      return;
    }
    if (question.max !== undefined && num > question.max) {
      setError(`${question.max} 이하로 입력해 주세요.`);
      return;
    }
    setError('');
    onSubmit(num);
  };
  return (
    <div className="space-y-3">
      <input
        type="number"
        value={val}
        min={question.min}
        max={question.max}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        className="w-full rounded-xl border border-gray-200 p-3"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={val === ''}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow disabled:opacity-60 hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99]"
      >
        다음
      </button>
    </div>
  );
}

export function MultiSelect({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (vals: any[]) => void;
}) {
  const [selected, setSelected] = useState<any[]>([]);
  const toggle = (v: any) => {
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
        {question.options!.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => toggle(opt.value)}
              className={[
                'rounded-xl border p-2 text-sm transition whitespace-nowrap',
                active
                  ? 'bg-sky-50 ring-2 ring-sky-400'
                  : 'border-gray-200 bg-white hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSubmit(selected)}
        disabled={selected.length === 0}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow disabled:opacity-60 hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99]"
      >
        다음
      </button>
    </div>
  );
}
