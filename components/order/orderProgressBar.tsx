import React from "react";
import {
  steps,
  getStatusClass,
  getLineClass,
  getLineText,
} from "@/lib/order/orderProgressUtils";
import { OrderStatus } from "@/lib/order/orderStatus";

type OrderProgressBarProps = {
  currentStatus: OrderStatus;
};

export default function OrderProgressBar({
  currentStatus,
}: OrderProgressBarProps) {
  return (
    <div className="flex items-center mb-6">
      {steps.map((step, stepIndex) => (
        <React.Fragment key={stepIndex}>
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold ${getStatusClass(
                stepIndex + 1,
                currentStatus
              )}`}
            >
              {stepIndex + 1}
            </div>
            <span className="whitespace-nowrap mt-2 text-xs text-center">
              {step.label}
            </span>
          </div>
          {stepIndex < steps.length - 1 && (
            <div className="relative flex items-center justify-center flex-1">
              <div
                className={`mb-5 h-1 w-full ${getLineClass(
                  stepIndex + 1,
                  currentStatus
                )}`}
              />
              <span className="absolute w-[120%] text-center bottom-[28px] text-xs text-gray-500">
                {getLineText(stepIndex + 1)}
              </span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
