import mongoose from "mongoose";

/**
 * Executes a function within a MongoDB transaction, automatically retrying on TransientTransactionErrors.
 * @param {Function} transactionFn Function receiving (session) and executing database operations.
 * @param {number} maxRetries Maximum retry attempts for transient write conflicts.
 */
export const withTransactionRetry = async (transactionFn, maxRetries = 5) => {
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
        (error.message && error.message.includes("Please retry your operation")) ||
        error.code === 112 ||
        error.code === 251;

      if (isTransient && attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, Math.floor(Math.random() * 15) + 5));
        continue;
      }
      throw error;
    }
  }
};
