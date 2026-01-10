import { GOOGLE_API_KEY, SHEET_ID } from "./config.js";
import { getAccessToken } from "./auth.js";

const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

const buildHeaders = () => {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
};

export const getSheetRange = async (tab, range = "A1:Z1000") => {
  const url = `${BASE_URL}/values/${encodeURIComponent(tab)}!${range}?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) throw new Error("Falha ao ler dados do Sheets.");
  return response.json();
};

export const getSheetRows = async (tab) => {
  const data = await getSheetRange(tab);
  const [headers = [], ...rows] = data.values || [];
  return mapRows(headers, rows);
};

export const appendRow = async (tab, values) => {
  const url = `${BASE_URL}/values/${encodeURIComponent(tab)}:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ values: [values] })
  });
  if (!response.ok) throw new Error("Falha ao gravar no Sheets.");
  return response.json();
};

export const updateRow = async (tab, rowIndex, values) => {
  const url = `${BASE_URL}/values/${encodeURIComponent(tab)}!A${rowIndex}:Z${rowIndex}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify({ values: [values] })
  });
  if (!response.ok) throw new Error("Falha ao atualizar no Sheets.");
  return response.json();
};

export const mapRows = (headers, rows) => {
  return rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] || "";
    });
    return entry;
  });
};
