"use client";
import { useEffect, useRef } from "react";

interface PhoneNumberInputsProps {
  phonePart1: string;
  phonePart2: string;
  phonePart3: string;
  setPhonePart1: (v: string) => void;
  setPhonePart2: (v: string) => void;
  setPhonePart3: (v: string) => void;
}

export default function PhoneNumberInputs({
  phonePart1,
  phonePart2,
  phonePart3,
  setPhonePart1,
  setPhonePart2,
  setPhonePart3,
}: PhoneNumberInputsProps) {
  const ref1 = useRef<HTMLInputElement | null>(null);
  const ref2 = useRef<HTMLInputElement | null>(null);
  const ref3 = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!phonePart1 && ref1.current) ref1.current.focus();
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!raw) return;
    e.preventDefault();
    const p1 = raw.slice(0, 3);
    const p2 = raw.slice(3, 7);
    const p3 = raw.slice(7, 11);
    setPhonePart1(p1);
    setPhonePart2(p2);
    setPhonePart3(p3);
    if (p3.length === 4) ref3.current?.focus();
    else if (p2.length === 4) ref3.current?.focus();
    else if (p1.length === 3) ref2.current?.focus();
  };

  const onChange1 = (v: string) => {
    const val = v.replace(/\D/g, "").slice(0, 3);
    setPhonePart1(val);
    if (val.length === 3) ref2.current?.focus();
  };

  const onChange2 = (v: string) => {
    const val = v.replace(/\D/g, "").slice(0, 4);
    setPhonePart2(val);
    if (val.length === 4) ref3.current?.focus();
  };

  const onChange3 = (v: string) => {
    const val = v.replace(/\D/g, "").slice(0, 4);
    setPhonePart3(val);
  };

  return (
    <div className="px-4 flex gap-2 items-center">
      <input
        ref={ref1}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        value={phonePart1}
        onChange={(e) => onChange1(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") ref2.current?.focus();
        }}
        onPaste={handlePaste}
        className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-1.5 text-center transition-colors ${
          phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
        }`}
        placeholder="010"
      />
      <span className="text-gray-500">-</span>
      <input
        ref={ref2}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={phonePart2}
        onChange={(e) => onChange2(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === "Backspace" &&
            e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === 0 &&
            !e.currentTarget.value
          ) {
            e.preventDefault();
            ref1.current?.focus();
          }
        }}
        className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
          phonePart2.length === 4 ? "bg-gray-100 text-gray-500" : ""
        }`}
        placeholder=""
      />
      <span className="text-gray-500">-</span>
      <input
        ref={ref3}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={phonePart3}
        onChange={(e) => onChange3(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === "Backspace" &&
            e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === 0 &&
            !e.currentTarget.value
          ) {
            e.preventDefault();
            ref2.current?.focus();
          }
        }}
        className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
          phonePart3.length === 4 ? "bg-gray-100 text-gray-500" : ""
        }`}
        placeholder=""
      />
    </div>
  );
}
