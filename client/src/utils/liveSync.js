/**
 * MasterPath Real-Time Cross-Tab Synchronization Service
 * 
 * Enables simultaneous two-tab live execution:
 * - Tab 1: Instructor (Creates, extracts, and publishes curriculum)
 * - Tab 2: Student (Receives instant live updates without page refresh)
 * 
 * Uses standard BroadcastChannel API with fallback to window storage events
 * and DOM CustomEvents.
 */

const CHANNEL_NAME = 'masterpath_live_sync';
const STORAGE_SYNC_KEY = 'masterpath_last_published';

let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (err) {
  console.warn('[LiveSync] BroadcastChannel unavailable, using storage events:', err);
}

/**
 * Broadcast curriculum publication event to all open tabs and windows
 */
export function notifyCurriculumPublished(detail = {}) {
  const payload = {
    type: 'CURRICULUM_PUBLISHED',
    timestamp: Date.now(),
    courseId: detail.courseId || null,
    extractedData: detail.extractedData || null,
  };

  // 1. Post to BroadcastChannel (cross-tab)
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (err) {
      console.warn('[LiveSync] BroadcastChannel postMessage error:', err);
    }
  }

  // 2. Trigger localStorage storage event (cross-tab fallback)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_SYNC_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  // 3. Dispatch internal custom event (current tab)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('pathwise_curriculum_updated', {
          detail: payload,
        })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribe to live cross-tab updates
 * Automatically deduplicates bursts and cleans up on unmount
 */
export function subscribeToLiveSync(onSync) {
  if (typeof window === 'undefined') return () => {};

  let debounceTimer = null;
  const trigger = (data) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onSync(data || { type: 'CURRICULUM_PUBLISHED', timestamp: Date.now() });
    }, 250);
  };

  // BroadcastChannel listener
  const handleBroadcast = (event) => {
    if (event?.data?.type === 'CURRICULUM_PUBLISHED') {
      trigger(event.data);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Storage event listener (fires in all other tabs when localStorage changes)
  const handleStorage = (event) => {
    if (event.key === STORAGE_SYNC_KEY && event.newValue) {
      trigger({ type: 'CURRICULUM_PUBLISHED', timestamp: Number(event.newValue) });
    }
  };
  window.addEventListener('storage', handleStorage);

  // Local tab custom event
  const handleLocal = (event) => {
    trigger(event.detail);
  };
  window.addEventListener('pathwise_curriculum_updated', handleLocal);

  // Return unsubscribe
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('pathwise_curriculum_updated', handleLocal);
  };
}

export default {
  notifyCurriculumPublished,
  subscribeToLiveSync,
};
