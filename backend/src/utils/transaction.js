import mongoose from "mongoose";

/**
 * Executes a function within a MongoDB transaction, automatically retrying on TransientTransactionErrors and Write Conflicts.
 * @param {Function} transactionFn Function receiving (session) and executing database operations.
 * @param {number} maxRetries Maximum retry attempts for transient write conflicts (default: 15).
 */
export const withTransactionRetry = async (transactionFn, maxRetries = 15) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await transactionFn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction().catch(() => {});
      session.endSession();

      const isTransient =
        (error.hasErrorLabel && error.hasErrorLabel("TransientTransactionError")) ||
        (error.message && (
          error.message.includes("Please retry your operation") ||
          error.message.includes("Write conflict") ||
          error.message.includes("WriteConflict")
        )) ||
        error.code === 112 ||
        error.code === 251;

      if (isTransient && attempt < maxRetries) {
        // Exponential backoff with jitter (10ms to 80ms)
        const delay = Math.floor(Math.random() * 20 * attempt) + 10;
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }
};
