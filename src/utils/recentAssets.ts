// Backs the command palette's "Recently Viewed" section. Kept in localStorage rather than
// the API since it's purely a per-browser convenience — no server round trip, and it
// survives refreshes without needing an endpoint of its own.

export interface RecentAsset {
  assetID: number;
  assetDesc: string;
  assetCode: string;
  category?: string;
}

const KEY = 'recentlyViewedAssets';
const MAX_ENTRIES = 5;

export function getRecentAssets(): RecentAsset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentAsset(asset: RecentAsset) {
  try {
    const deduped = getRecentAssets().filter((a) => a.assetID !== asset.assetID);
    const next = [asset, ...deduped].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage full — recents are a convenience, not required.
  }
}
