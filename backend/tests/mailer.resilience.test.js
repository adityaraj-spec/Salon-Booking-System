import { jest } from "@jest/globals";

const sendTransacEmail = jest.fn().mockRejectedValue({
  message: "Request failed",
  response: {
    statusCode: 401,
    body: {
      code: "unauthorized",
      message: "Key not found",
    },
  },
});

jest.unstable_mockModule("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: class {
    setApiKey() {}
    sendTransacEmail(...args) {
      return sendTransacEmail(...args);
    }
  },
  TransactionalEmailsApiApiKeys: { apiKey: 0 },
  SendSmtpEmail: class {},
}));

const { sendBrevoEmail } = await import("../src/utils/mailer.js");

describe("Brevo mailer resilience", () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = "xkeysib-test-key";
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
  });

  it("returns a failure result instead of rejecting on Brevo API errors", async () => {
    await expect(
      sendBrevoEmail({
        to: "recipient@example.com",
        subject: "Verification code",
        html: "<p>1234</p>",
      })
    ).resolves.toEqual({ success: false, error: "Email delivery failed" });

    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
  });
});
