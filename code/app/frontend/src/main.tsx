import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { addTrials } from "./rounds/rounds.ts";
import { App } from "./shell/App.tsx";
import "./shell/styles.css";

async function start() {
  // The dev server alone adds the trial rounds, one per input, at /?try=<input>.
  if (import.meta.env.DEV) addTrials((await import("./fixtures/trials.ts")).TRIALS);
  // The dev server alone replays one of 6.3.1's example games behind its bot,
  // at /?replay=<game>, for the browser's tests.
  const replay = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("replay") : null;
  if (replay) (await import("./fixtures/replay.ts")).replay(replay);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
