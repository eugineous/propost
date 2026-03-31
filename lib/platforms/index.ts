// Platform adapter registry
// Returns the correct adapter instance for a given Platform

import type { Platform } from '../types'
import { XAdapter } from './x'
import { InstagramAdapter } from './instagram'
import { FacebookAdapter } from './facebook'
import { LinkedInAdapter } from './linkedin'
import { WebsiteAdapter } from './website'

export type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'

// Lazy singleton instances per platform
const adapters: Partial<Record<Platform, ReturnType<typeof createAdapter>>> = {}

function createAdapter(platform: Platform) {
  switch (platform) {
    case 'x':
      return new XAdapter()
    case 'instagram':
      return new InstagramAdapter()
    case 'facebook':
      return new FacebookAdapter()
    case 'linkedin':
      return new LinkedInAdapter()
    case 'website':
      return new WebsiteAdapter()
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

export function getPlatformAdapter(platform: Platform) {
  if (!adapters[platform]) {
    adapters[platform] = createAdapter(platform)
  }
  return adapters[platform]!
}
