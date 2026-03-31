// Global EventEmitter singleton for SSE event broadcasting
// Events: 'activity', 'agent:status', 'db:critical', 'alert'

import { EventEmitter } from 'events'

export const propostEvents = new EventEmitter()
propostEvents.setMaxListeners(100)
