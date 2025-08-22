// lib/msalClient.ts
import { ConfidentialClientApplication, Configuration, AuthorizationUrlRequest, AuthorizationCodeRequest, AuthenticationResult, RefreshTokenRequest } from "@azure/msal-node";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: process.env.AZURE_AUTHORITY || "https://login.microsoftonline.com/common",
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

export const OAUTH_SCOPES = [
  "openid",
  "profile",
  "offline_access", // Required for refresh tokens!
  "User.Read",
  "OnlineMeetings.ReadWrite"
];

export async function getAuthUrl(state: string) {
  const authCodeUrlRequest: AuthorizationUrlRequest = {
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI!,
    state,
    prompt: "consent", // force consent for testing
  };

  return cca.getAuthCodeUrl(authCodeUrlRequest);
}

export async function acquireTokenByCode(code: string): Promise<AuthenticationResult | null> {
  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI!,
  };

  return await cca.acquireTokenByCode(tokenRequest);
}

// NEW: Acquire a token silently using the refresh token
export async function acquireTokenByRefreshToken(refreshToken: string): Promise<AuthenticationResult | null> {
  const refreshTokenRequest: RefreshTokenRequest = {
    refreshToken,
    scopes: OAUTH_SCOPES,
  };

  return await cca.acquireTokenByRefreshToken(refreshTokenRequest);
}
