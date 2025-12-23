// Simple badge updater using callbacks
type BadgeUpdateCallback = () => void;

let badgeUpdateCallbacks: BadgeUpdateCallback[] = [];

export const badgeUpdater = {
  subscribe: (callback: BadgeUpdateCallback) => {
    badgeUpdateCallbacks.push(callback);
    return () => {
      badgeUpdateCallbacks = badgeUpdateCallbacks.filter(cb => cb !== callback);
    };
  },
  update: () => {
    badgeUpdateCallbacks.forEach(callback => callback());
  },
};

