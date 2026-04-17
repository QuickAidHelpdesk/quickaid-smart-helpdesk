import {
  PublicClientApplication,
  Configuration,
  BrowserCacheLocation,
} from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MSAL_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_MSAL_TENANT_ID}`,
    redirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// MSAL v3+ requires explicit initialization before use
export const msalInitPromise = msalInstance.initialize();

export const loginRequest = {
  scopes: ["User.Read"],
  prompt: "select_account",
};
