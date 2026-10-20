process.env.NODE_ENV = "production";
process.env.ENABLE_REDIS = "false";

const { checkOTPRequestRateLimit } = await import("../src/utils/otp.js");

describe("OTP service resilience", () => {
  it("does not block registration when Redis is unavailable", async () => {
    await expect(
      checkOTPRequestRateLimit("redis-unavailable@example.com", "127.0.0.1")
    ).resolves.toBeUndefined();
  });
});
