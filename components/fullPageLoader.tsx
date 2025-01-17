import React, { useEffect } from "react";

export default function FullPageLoader() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mt-48 w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
