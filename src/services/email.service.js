import nodemailer from 'nodemailer'
import { config } from '../config/env.js'

let transporter = null

function usingResend() {
  return Boolean(config.resendApiKey)
}

function ensureConfig() {
  if (usingResend()) {
    // Resend still needs a valid From domain
    if (!config.smtpFrom) {
      throw new Error('SMTP_FROM is required when using Resend to set the sender address.')
    }
    return
  }

  const required = [
    config.smtpHost,
    config.smtpPort,
    config.smtpUser,
    config.smtpPass,
    config.smtpFrom
  ]

  if (required.some((value) => !value)) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in the environment.')
  }
}

function buildTransporter() {
  ensureConfig()

  const secure = Number(config.smtpPort) === 465

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  })

  return transporter
}

export function getTransporter() {
  if (transporter) return transporter
  return buildTransporter()
}

async function sendViaResend({ subject, html, text, to, bcc }) {
  const payload = {
    from: config.smtpFrom,
    to: to || config.smtpFrom,
    bcc,
    subject,
    text,
    html
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const message = `Resend API error (${res.status}): ${await res.text()}`
    throw new Error(message)
  }

  return res.json()
}

export async function sendEmail({ subject, html, text, to, bcc }) {
  if (usingResend()) {
    return sendViaResend({ subject, html, text, to, bcc })
  }

  const mailer = getTransporter()

  const payload = {
    from: config.smtpFrom,
    to: to || config.smtpFrom,
    bcc,
    subject,
    text,
    html
  }

  return mailer.sendMail(payload)
}
