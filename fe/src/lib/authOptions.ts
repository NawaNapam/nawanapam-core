import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "./prisma";
import type { User as NextAuthUser } from "next-auth";
import { googleEnv, nextEnv } from "@/envs/e";
import { sendWelcomeEmail } from "./email";

const googleIdTokenClient = googleEnv.CLIENT_ID
  ? new OAuth2Client(googleEnv.CLIENT_ID)
  : null;

const providers = [];

if (googleEnv.CLIENT_ID && googleEnv.CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: googleEnv.CLIENT_ID,
      clientSecret: googleEnv.CLIENT_SECRET,
    }),
  );
}

if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
  providers.push(
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(
        credentials.password,
        user.passwordHash,
      );

      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        phoneNumber: user.phoneNumber || undefined,
        gender: user.gender || undefined,
      } as NextAuthUser;
    },
  }),
);

// Used only by the Capacitor Android app: it obtains a Google ID token via the
// native Sign-In SDK (avoids Google's block on OAuth redirects inside WebViews)
// and hands it here to be verified and turned into a normal session. The
// website continues to use the redirect-based GoogleProvider above, untouched.
if (googleIdTokenClient) {
  providers.push(
    CredentialsProvider({
      id: "google-native",
      name: "Google (Native)",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          return null;
        }

        let email: string | undefined;
        let name: string | undefined | null;
        let image: string | undefined | null;
        let emailVerified: boolean | undefined;
        let sub: string;

        try {
          const ticket = await googleIdTokenClient!.verifyIdToken({
            idToken: credentials.idToken,
            audience: googleEnv.CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (!payload?.email || !payload.sub) {
            return null;
          }
          email = payload.email;
          name = payload.name;
          image = payload.picture;
          emailVerified = payload.email_verified;
          sub = payload.sub;
        } catch (error) {
          console.error("[Auth] Failed to verify native Google ID token:", error);
          return null;
        }

        let user = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              image,
              emailVerified: emailVerified ? new Date() : null,
            },
            include: { accounts: true },
          });

          try {
            await sendWelcomeEmail(user.email);
          } catch (error) {
            console.error(
              `Failed to send welcome email to ${user.email}:`,
              error,
            );
          }
        }

        const alreadyLinked = user.accounts.some(
          (acc) => acc.provider === "google",
        );
        if (!alreadyLinked) {
          await prisma.account.create({
            data: {
              userId: user.id,
              type: "oauth",
              provider: "google",
              providerAccountId: sub,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          phoneNumber: user.phoneNumber || undefined,
          gender: user.gender || undefined,
        } as NextAuthUser;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,

  session: { strategy: "jwt" },

  events: {
    async createUser({ user }) {
      // Send welcome email when a new user is created (OAuth sign-up)
      if (user.email) {
        try {
          await sendWelcomeEmail(user.email);
          // console.log(`Welcome email sent to: ${user.email}`);
        } catch (error) {
          console.error(
            `Failed to send welcome email to ${user.email}:`,
            error,
          );
        }
      }
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow credentials sign-in
      if (account?.provider === "credentials") {
        return true;
      }

      // Handle OAuth sign-in (Google, Instagram, etc.)
      if (account?.provider && user.email) {
        try {
          // Check if user exists with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if this OAuth provider is already linked
            const accountLinked = existingUser.accounts.some(
              (acc) => acc.provider === account.provider,
            );

            if (!accountLinked) {
              // User exists but OAuth account not linked
              // Automatically link the account
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
              // console.log(
              //   `[Auth] Linked ${account.provider} account to existing user: ${user.email}`
              // );
            }
          }

          return true;
        } catch (error) {
          console.error("[Auth] Error in signIn callback:", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session: _session }) {
      // On sign in, add ALL user data to token
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.phoneNumber = user.phoneNumber;
        token.gender = user.gender;
      }

      // On update (if you use session update), refresh from DB
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            image: true,
            phoneNumber: true,
            gender: true,
          },
        });

        if (dbUser) {
          token.username = dbUser.username as string;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.phoneNumber = dbUser.phoneNumber || undefined;
          token.gender = dbUser.gender || undefined;
        }
      }

      // If data is missing but we have an ID, fetch it from DB
      if (
        token.id &&
        (!token.username || !token.phoneNumber || !token.gender)
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            username: true,
            phoneNumber: true,
            gender: true,
          },
        });

        if (dbUser) {
          if (dbUser.username) token.username = dbUser.username;
          if (dbUser.phoneNumber) token.phoneNumber = dbUser.phoneNumber;
          if (dbUser.gender) token.gender = dbUser.gender;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | undefined;
        session.user.phoneNumber = token.phoneNumber as string | undefined;
        session.user.gender = token.gender as "MALE" | "FEMALE" | "OTHER";

        // Fallback: if still missing data, fetch from DB
        if (
          !session.user.username ||
          !session.user.phoneNumber ||
          !session.user.gender
        ) {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              username: true,
              phoneNumber: true,
              gender: true,
            },
          });

          if (dbUser) {
            if (dbUser.username) session.user.username = dbUser.username;
            if (dbUser.phoneNumber)
              session.user.phoneNumber = dbUser.phoneNumber;
            if (dbUser.gender) session.user.gender = dbUser.gender;
          }
        }
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}/dashboard`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors to login page
  },
  secret: nextEnv.NA_SECRET,
};
