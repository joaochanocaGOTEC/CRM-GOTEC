const CACHE_PREFIX = "crm-cache-";
const QUEUE_KEY = "crm-sync-queue";

export const setCache = (key, data) => {
  const payload = {
    timestamp: Date.now(),
    data
  };
  localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
};

export const getCache = (key) => {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const setLastUser = (user) => {
  localStorage.setItem("crm-user", JSON.stringify(user));
};

export const getLastUser = () => {
  const raw = localStorage.getItem("crm-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const addToQueue = (entry) => {
  const queue = getQueue();
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = () => {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
};

export const removeFromQueue = (id) => {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const clearQueue = () => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
};
