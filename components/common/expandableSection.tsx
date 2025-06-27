import { useState, useRef, useEffect } from "react";

export function ExpandableSection({ title, children }: any) {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem(`expandable-${title}`) === "true";
  });
  const contentRef: any = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState("0px");
  useEffect(() => {
    if (isOpen) {
      setHeight(`${contentRef.current?.scrollHeight + 2}px`);
    } else {
      setHeight("0px");
    }
    localStorage.setItem(`expandable-${title}`, String(isOpen));
  }, [isOpen]);
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  return (
    <div
      className={`bg-gray-100 rounded-md p-3 mb-4 transition-all duration-300 ${
        !isOpen ? "hover:bg-gray-200 cursor-pointer" : ""
      }`}
      onClick={!isOpen ? handleToggle : undefined}
    >
      <div
        className="flex items-center gap-2 cursor-pointer hover:text-gray-900"
        onClick={handleToggle}
      >
        <span
          className={`text-gray-700 transform transition-transform duration-300 text-sm ${
            isOpen ? "rotate-90" : "rotate-0"
          }`}
          style={{ fontSize: "10px" }}
        >
          ▶
        </span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div
        ref={contentRef}
        style={{ height }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        onClick={stopPropagation}
      >
        {isOpen && <div className="mt-2 pl-3 pr-1">{children}</div>}
      </div>
    </div>
  );
}
