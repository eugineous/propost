// Error taxonomy for ProPost
// All custom error classes used across the system

import type { Platform } from './types'

export class PlatformAPIError extends Error {
  constructor(
    public platform: Platform,
    public statusCode: number,
    public rateLimited: boolean,
    message: string
  ) {
    super(message)
    this.name = 'PlatformAPIError'
  }
}

export class AIProviderError extends Error {
  constructor(
    public provider: 'gemini' | 'nvidia',
    public timedOut: boolean,
    message: string
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export class WebhookVerificationError extends Error {
  constructor(
    public platform: Platform,
    public sourceIp: string,
    message: string
  ) {
    super(message)
    this.name = 'WebhookVerificationError'
  }
}

export class CredentialMissingError extends Error {
  constructor(
    public envVar: string,
    public platform: Platform,
    message: string
  ) {
    super(message)
    this.name = 'CredentialMissingError'
  }
}

export class RateLimitError extends Error {
  constructor(
    public platform: Platform,
    public resetAt: Date,
    message: string
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}
