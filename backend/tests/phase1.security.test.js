import { generateOTP, hashOTP, verifyOTPHash } from "../src/utils/otp.js";
import { sanitizeNoSQL } from "../src/middleware/sanitize.js";
import { jest } from "@jest/globals";


describe("Phase 1 Security & Validation Suite", () => {
  describe("OTP Security Utility", () => {
    it("should generate a 6-digit numerical string", () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it("should hash OTP using SHA-256 and verify correctly", () => {
      const rawOtp = "654321";
      const hash = hashOTP(rawOtp);
      expect(hash).toHaveLength(64); // SHA-256 hex string length
      expect(verifyOTPHash("654321", hash)).toBe(true);
      expect(verifyOTPHash("123456", hash)).toBe(false);
    });
  });

  describe("NoSQL Injection Sanitizer Middleware", () => {
    it("should strip keys starting with $ or containing . from request body and query", () => {
      const req = {
        body: {
          username: "validuser",
          password: { $gt: "" },
          "admin.role": "hacked",
        },
        query: {
          email: { $ne: null },
        },
        params: {},
      };
      const next = jest.fn();

      sanitizeNoSQL(req, {}, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ username: "validuser", password: {} });
      expect(req.query).toEqual({ email: {} });
    });
  });
});
