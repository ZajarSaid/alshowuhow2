import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

class CustomerLoginDisabled extends CredentialsSignin {
  code = "customer_login_disabled";
}

class VendorNotApproved extends CredentialsSignin {
  code = "vendor_not_approved";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        // Customers never log in — they just submit requests.
        // Their accounts exist only to link requests and leads together.
        if (user.role === "CUSTOMER") throw new CustomerLoginDisabled();

        // Vendors must be approved before they can access the platform.
        if (user.role === "VENDOR") {
          const vendor = await db.vendor.findUnique({
            where: { userId: user.id },
          });
          if (!vendor || vendor.status !== "APPROVED") {
            throw new VendorNotApproved();
          }
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  // The admin console is served on its own host (admin.* via src/middleware.ts),
  // so we must accept requests from any host pointing at this deployment.
  trustHost: true,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
