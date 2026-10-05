/**
 * Test the email service by sending to an arbitrary recipient.
 *
 * Usage: RESEND_API_KEY=... EMAIL_FROM=... npx tsx scripts/test-email.ts you@example.com
 */
import "dotenv/config";
import { Resend } from "resend";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/test-email.ts <recipient@example.com>");
    process.exit(1);
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set in the environment.");
    process.exit(1);
  }

  const from = process.env.EMAIL_FROM || "ALshowUhow <no-reply@alshowuhow.com>";

  if (!process.env.NEXTAUTH_URL) {
    console.warn("NEXTAUTH_URL is not set — email links may point nowhere.");
  }

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "ALshowUhow — test email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#172554;">
        <h2 style="margin-top:0;">Email delivery works</h2>
        <p>This is a test message from ALshowUhow. If you received it, the email
        service is sending to real recipients correctly.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send:", error);
    process.exit(1);
  }

  console.log(`Email sent to ${to} (id: ${data?.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
