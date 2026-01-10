import { ALLOWED_USERS, GOOGLE_CLIENT_ID, ROLE_MAP, SCOPES } from "./config.js";
import { setLastUser } from "./store.js";

let tokenClient;
let accessToken = null;
let currentUser = null;

export const initAuth = () => {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
    }
  });
};

export const login = async () => {
  if (!tokenClient) initAuth();
  await new Promise((resolve, reject) => {
    tokenClient.callback = async (tokenResponse) => {
      if (tokenResponse.error) {
        reject(tokenResponse);
        return;
      }
      accessToken = tokenResponse.access_token;
      try {
        const profile = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }).then((response) => response.json());

        const email = profile.email?.toLowerCase();
        if (!email || !ALLOWED_USERS.map((item) => item.toLowerCase()).includes(email)) {
          accessToken = null;
          throw new Error("Utilizador não autorizado.");
        }

        currentUser = {
          email,
          name: profile.name || email,
          picture: profile.picture || "",
          role: ROLE_MAP[email] || "comercial"
        };
        setLastUser(currentUser);
        resolve(currentUser);
      } catch (error) {
        reject(error);
      }
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  return currentUser;
};

export const getAccessToken = () => accessToken;

export const getCurrentUser = () => currentUser;

export const setCurrentUser = (user) => {
  currentUser = user;
};

export const logout = () => {
  accessToken = null;
  currentUser = null;
  localStorage.removeItem("crm-user");
};
