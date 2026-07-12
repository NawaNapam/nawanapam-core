import { initBE } from "./app";
import { startWorker } from "./workers/retryPersist";

initBE().catch(console.error);

// Runs the call-history persistence worker in this same process/service
// instead of a separate (paid) Render background worker.
startWorker().catch((e) => console.error("[worker] fatal on startup:", e));
