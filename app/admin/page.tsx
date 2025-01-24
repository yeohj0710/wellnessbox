"use client";

import React, { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import CategoryManager from "@/components/categoryManager";
import ProductManager from "@/components/productManager";
import PharmacyProductManager from "@/components/pharmacyProductManager";

export default function Admin() {
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-12 gap-6">
      <AccordionItem
        title="약국 상품 관리"
        ContentComponent={PharmacyProductManager}
      />
      <AccordionItem title="상품 관리" ContentComponent={ProductManager} />
      <AccordionItem title="카테고리 관리" ContentComponent={CategoryManager} />
    </div>
  );
}

interface AccordionProps {
  title: string;
  ContentComponent: React.FC;
}

const AccordionItem: React.FC<AccordionProps> = ({
  title,
  ContentComponent,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleAccordion = () => {
    setIsExpanded((prev) => !prev);
  };
  return (
    <div className="w-full max-w-[640px] px-10 py-6 bg-white sm:shadow-md sm:rounded-lg">
      <div
        onClick={toggleAccordion}
        className="flex justify-between items-center cursor-pointer"
      >
        <span className="text-xl font-bold text-gray-800">{title}</span>
        <span className="w-6 h-6">
          {isExpanded ? (
            <ChevronUpIcon className="text-gray-600" />
          ) : (
            <ChevronDownIcon className="text-gray-600" />
          )}
        </span>
      </div>
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
