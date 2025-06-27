"use client";
import { useEffect } from "react";

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
  useEffect(() => {
    localStorage.setItem("phonePart1_input", phonePart1);
  }, [phonePart1]);
  useEffect(() => {
    localStorage.setItem("phonePart2_input", phonePart2);
  }, [phonePart2]);
  useEffect(() => {
    localStorage.setItem("phonePart3_input", phonePart3);
  }, [phonePart3]);
  return (
    <div className="px-4 flex gap-2 items-center">
      <input
        type="text"
        maxLength={3}
        value={phonePart1}
        onChange={(e) => {
          const newValue = e.target.value.replace(/\D/g, "");
          setPhonePart1(newValue);
        }}
        onInput={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.value.length === 3) {
            input.classList.add("bg-gray-100", "text-gray-500");
          } else {
            input.classList.remove("bg-gray-100", "text-gray-500");
          }
        }}
        className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-1.5 text-center transition-colors ${
          phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
        }`}
      />
      <span className="text-gray-500">-</span>
      <input
        id="phonePart2"
        type="text"
        maxLength={4}
        value={phonePart2}
        onChange={(e) => {
          const newValue = e.target.value.replace(/\D/g, "");
          setPhonePart2(newValue);
          if (newValue.length === 4) {
            (
              document.getElementById("phonePart3") as HTMLInputElement
            )?.focus();
          }
        }}
        onInput={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.value.replace(/\D/g, "").length === 4) {
            input.classList.add("bg-gray-100", "text-gray-500");
          } else {
            input.classList.remove("bg-gray-100", "text-gray-500");
          }
        }}
        className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
          phonePart2.length === 4 ? "bg-gray-100 text-gray-500" : ""
        }`}
      />
      <span className="text-gray-500">-</span>
      <input
        id="phonePart3"
        type="text"
        maxLength={4}
        value={phonePart3}
        onChange={(e) => {
          const newValue = e.target.value.replace(/\D/g, "");
          setPhonePart3(newValue);
        }}
        onInput={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.value.replace(/\D/g, "").length === 4) {
            input.classList.add("bg-gray-100", "text-gray-500");
          } else {
            input.classList.remove("bg-gray-100", "text-gray-500");
          }
        }}
        className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors"
      />
    </div>
  );
}
