import { Suspense } from "react";
import CopilotClient from "./copilot-client";

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Loading copilot...</div>}>
      <CopilotClient />
    </Suspense>
  );
}
