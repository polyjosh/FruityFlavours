import "server-only";
import { db } from "./db";
import { maskPhone } from "@/lib/shared/phone";

interface SendSmsInput {
  to: string;
  body: string;
  template: string;
  orderId?: string | null;
  userId?: string | null;
  /** Stored in the SMS log instead of `body` (used for one-time codes). */
  logBody?: string;
}

function atConfig() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return null;
  const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  return { username, apiKey, senderId: process.env.AT_SENDER_ID || undefined, url: `https://${host}/version1/messaging` };
}

export const smsConfigured = () => atConfig() !== null;

/**
 * The one way to send an SMS. Writes the notifications row first (the SMS log), then sends
 * through Africa's Talking and records sent / failed. Without AT keys the row stays "queued".
 */
export async function sendSms(input: SendSmsInput) {
  const prisma = await db();
  const row = await prisma.notification.create({
    data: {
      channel: "sms",
      template: input.template,
      recipient: input.to,
      body: input.logBody ?? input.body,
      orderId: input.orderId ?? null,
      userId: input.userId ?? null,
    },
  });
  return deliver(row.id, input.body);
}

/** Re-sends a logged SMS (admin "Resend"). One-time-code messages can't be resent from the log. */
export async function resendSms(notificationId: string) {
  const prisma = await db();
  const row = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  if (row.template === "otp") throw new Error("Codes can't be resent from the log.");
  return deliver(row.id, row.body);
}

async function deliver(notificationId: string, body: string) {
  const prisma = await db();
  const row = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  const cfg = atConfig();
  if (!cfg) {
    if (process.env.NODE_ENV !== "production") {
      // Dev only: SMS isn't configured, so print it (codes included) to the server console.
      console.info(`[sms:not-sent] to ${maskPhone(row.recipient)}: ${body}`);
    }
    return row;
  }

  const form = new URLSearchParams({ username: cfg.username, to: row.recipient, message: body });
  if (cfg.senderId) form.set("from", cfg.senderId);

  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { apiKey: cfg.apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as {
      SMSMessageData?: { Message?: string; Recipients?: { status: string; messageId?: string }[] };
    } | null;
    const recipient = json?.SMSMessageData?.Recipients?.[0];
    if (res.ok && recipient?.status === "Success") {
      return prisma.notification.update({
        where: { id: row.id },
        data: { status: "sent", providerRef: recipient.messageId ?? null, error: null, sentAt: new Date(), attempts: { increment: 1 } },
      });
    }
    const error = recipient?.status || json?.SMSMessageData?.Message || `HTTP ${res.status}`;
    return prisma.notification.update({ where: { id: row.id }, data: { status: "failed", error, attempts: { increment: 1 } } });
  } catch (e) {
    return prisma.notification.update({
      where: { id: row.id },
      data: { status: "failed", error: e instanceof Error ? e.message : "Network error", attempts: { increment: 1 } },
    });
  }
}
