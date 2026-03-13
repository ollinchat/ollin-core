import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SlackProvider from "next-auth/providers/slack";

async function refreshGoogleAccessToken(token: any) {
  try {
    const refreshToken = token.googleRefreshToken as string | undefined;
    if (!refreshToken) return token;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[NextAuth] Failed to refresh Google access token:", res.status, errorBody);
      return token;
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    token.googleAccessToken = data.access_token ?? token.googleAccessToken;
    token.googleAccessTokenExpires = now + (data.expires_in ?? 3600) - 60;
    if (data.refresh_token) token.googleRefreshToken = data.refresh_token;

    return token;
  } catch (e) {
    console.error("[NextAuth] Error refreshing Google access token:", e);
    return token;
  }
}

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID ?? "",
      clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // Basic identity + messaging scopes; adjust as needed.
          scope: "identity.basic,identity.email,chat:write,channels:history",
        },
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative callbackUrl; otherwise send to dashboard
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, account }) {
      const anyToken = token as any;

      if (account) {
        if (account.provider === "google") {
          anyToken.googleAccessToken = account.access_token;
          anyToken.googleRefreshToken = account.refresh_token ?? anyToken.googleRefreshToken;
          anyToken.googleAccessTokenExpires =
            (account.expires_at as number | undefined) ??
            Math.floor(Date.now() / 1000) + 3600;
        }
        if (account.provider === "slack") {
          anyToken.slackAccessToken = account.access_token;
        }
        return token;
      }

      // If we already have an access token and it is still valid, return it
      const now = Math.floor(Date.now() / 1000);
      if (anyToken.googleAccessToken && anyToken.googleAccessTokenExpires && now < anyToken.googleAccessTokenExpires) {
        return token;
      }

      // Otherwise, try to refresh it using the refresh token
      return refreshGoogleAccessToken(anyToken);
    },
    async session({ session, token }) {
      (session as any).providers = {
        google: {
          accessToken: (token as any).googleAccessToken ?? null,
        },
        slack: {
          accessToken: (token as any).slackAccessToken ?? null,
        },
      };
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions };

