import { deleteMessagesBefore } from "../../repositories/message-repository.mjs";

const RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;

function createServerTimestamp(date = new Date()) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function createRetentionThreshold(now = new Date()) {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function runMessageRetentionCleanup(now = new Date()) {
  const thresholdSentAt = createServerTimestamp(createRetentionThreshold(now));
  const deletedCount = await deleteMessagesBefore(thresholdSentAt);

  return {
    deletedCount,
    thresholdSentAt
  };
}

export function startMessageRetentionScheduler() {
  const runCleanup = async () => {
    try {
      const result = await runMessageRetentionCleanup();

      if (result.deletedCount > 0) {
        console.log(
          `[retention] deleted ${result.deletedCount} messages older than ${result.thresholdSentAt}`
        );
      }
    } catch (error) {
      console.error("[retention] cleanup failed", error);
    }
  };

  runCleanup();

  const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}
