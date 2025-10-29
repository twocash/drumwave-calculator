import React from "react";

const KpiMetric = ({
  title,
  value,
  subtitle,
  baseline,
  tooltip,
}) => {
  return (
    <div className="relative bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-300">
      {/* Title with Tooltip Icon */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </div>
        {tooltip && (
          <div
            className="text-gray-400 text-xs cursor-help"
            title={tooltip}
          >
            ⓘ
          </div>
        )}
      </div>
      
      {/* Main Value */}
      <div className="text-4xl font-bold text-blue-600 mb-2 text-center">
        {value}
      </div>
      
      {/* Subtitle */}
      <div className="text-sm text-gray-500 text-center mb-3">
        {subtitle}
      </div>

      {/* Baseline Reference */}
      {baseline && (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
          <div className="text-xs text-gray-400 text-center font-medium">
            {baseline}
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiMetric;
