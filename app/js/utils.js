export const formatCurrency = (value) => {
  const numberValue = Number(value) || 0;
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(numberValue);
};

export const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const daysSince = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const uuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};
