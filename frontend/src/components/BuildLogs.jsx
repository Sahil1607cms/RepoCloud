import React, { useEffect, useRef } from "react";

const BuildLogs = ({ logs }) => {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom whenever logs change
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLineColorClass = (line) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("error:") || lowerLine.includes("fail") || lowerLine.includes("stderr")) {
      return "text-red-400";
    }
    if (lowerLine.includes("uploaded") || lowerLine.includes("done...") || lowerLine.includes("complete")) {
      return "text-green-400";
    }
    if (lowerLine.includes("installing") || lowerLine.includes("npm install") || lowerLine.includes("building")) {
      return "text-purple-400";
    }
    return "text-zinc-300";
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500"></span>
          <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          <span className="ml-2 font-mono text-xs text-zinc-500 uppercase tracking-wider">Build Terminal</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(logs.join("\n"));
          }}
          className="text-xs text-zinc-400 hover:text-white transition px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
        >
          Copy Logs
        </button>
      </div>

      <div className="h-80 overflow-y-auto font-mono text-sm leading-relaxed pr-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-zinc-500 italic flex items-center justify-center h-full">
            Waiting for logs to start streaming...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={`${getLineColorClass(log)} whitespace-pre-wrap break-all py-0.5`}>
              {log}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

export default BuildLogs;
