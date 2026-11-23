"use client";

import { useEffect, useState } from "react";

function split(v: number | null): [string, string] {
  if (v == null) return ["", ""];
  let m = Math.floor(v / 60);
  let s = Math.round((v - m * 60) * 10) / 10;
  if (s >= 60) {
    m += 1;
    s = 0;
  }
  return [String(m), String(s)];
}

function combine(m: string, s: string): number | null {
  if (m.trim() === "" && s.trim() === "") return null;
  const total = (Number(m) || 0) * 60 + (Number(s) || 0);
  return Math.max(0, Math.round(total * 10) / 10);
}

interface Props {
  /** 總秒數；null 代表還沒打點 */
  value: number | null;
  onChange: (sec: number | null) => void;
  label: string;
}

/** 用「分」和「秒」兩格輸入時間；對外仍是總秒數 */
export default function TimeInput({ value, onChange, label }: Props) {
  const [m, setM] = useState(() => split(value)[0]);
  const [s, setS] = useState(() => split(value)[1]);

  // 打點或切換版本改變了數值時，同步顯示（使用者自己正在輸入時不會被蓋掉）
  useEffect(() => {
    if (combine(m, s) !== value) {
      const [nm, ns] = split(value);
      setM(nm);
      setS(ns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (nm: string, ns: string) => {
    setM(nm);
    setS(ns);
    onChange(combine(nm, ns));
  };

  // 離開輸入框時整理格式，例如 1 分 75 秒 → 2 分 15 秒
  const normalize = () => {
    const [nm, ns] = split(value);
    setM(nm);
    setS(ns);
  };

  return (
    <span className="time-input" role="group" aria-label={label}>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={m}
        placeholder="0"
        onChange={(e) => update(e.target.value, s)}
        onBlur={normalize}
        aria-label={`${label}：分`}
      />
      <span className="time-unit">分</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={s}
        placeholder="0"
        onChange={(e) => update(m, e.target.value)}
        onBlur={normalize}
        aria-label={`${label}：秒`}
      />
      <span className="time-unit">秒</span>
    </span>
  );
}
