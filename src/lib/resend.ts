import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY が設定されていません')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_ADDRESS = process.env.RESEND_FROM ?? '物件提案システム <onboarding@resend.dev>'
