"use client";

import React, { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import CategoryManager from "@/components/manager/categoryManager";
import ProductManager from "@/components/manager/productManager";
import PharmacyProductManager from "@/components/manager/pharmacyProductManager";
import ModelManager from "@/components/manager/modelManager";

interface AccordionProps {
  title: string;
  ContentComponent: React.FC;
}

const AccordionItem: React.FC<AccordionProps> = ({
  title,
  ContentComponent,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="w-full max-w-[640px] px-10 py-6 bg-white sm:shadow-md sm:rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between cursor-pointer"
      >
        <span className="text-xl font-bold text-gray-800">{title}</span>
        <span className="w-6 h-6">
          {isExpanded ? (
            <ChevronUpIcon className="text-gray-600" />
          ) : (
            <ChevronDownIcon className="text-gray-600" />
          )}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out border-gray-200 ${
          isExpanded ? "h-auto opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-4 border-t pt-6">
          <ContentComponent />
        </div>
      </div>
    </div>
  );
};

export default function Admin() {
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-12 gap-6">
      <a
        href="/admin/b2b-reports"
        className="w-full max-w-[640px] px-10 py-6 bg-white sm:shadow-md sm:rounded-lg border border-indigo-100 hover:border-indigo-300 transition-colors"
      >
        <div className="text-xl font-bold text-gray-800">B2B 임직원 레포트 관리</div>
        <p className="mt-2 text-sm text-gray-600">
          임직원 목록 조회, 설문 입력, 분석 JSON 업로드, 약사 코멘트 관리, PPTX/PDF/ZIP 내보내기를 수행합니다.
        </p>
      </a>
      <AccordionItem title="AI 모델 설정" ContentComponent={ModelManager} />
      <AccordionItem title="약국 상품 관리" ContentComponent={PharmacyProductManager} />
      <AccordionItem title="상품 관리" ContentComponent={ProductManager} />
      <AccordionItem title="카테고리 관리" ContentComponent={CategoryManager} />
    </div>
  );
}
