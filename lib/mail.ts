import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY ausente.");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM ausente.");
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (result.error) {
    console.error("RESEND ERROR:", result.error);
    throw new Error(result.error.message || "Erro Resend desconhecido.");
  }

  return result.data;
}