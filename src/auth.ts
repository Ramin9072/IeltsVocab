import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/schemas";
import { verifyCredentials } from "@/lib/users-repo";
import { getRedis } from "@/lib/redis/client";
import { incrWindow } from "@/lib/redis/atomic";
import { K } from "@/lib/keys";

const MAX_ATTEMPTS = 10; // per email per 15 minutes
const WINDOW_SECONDS = 15 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // sessions persist for 30 days
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const key = K.rate("login", email);
        const { count } = await incrWindow(getRedis(), key, WINDOW_SECONDS);
        if (count > MAX_ATTEMPTS) return null;
        const user = await verifyCredentials(email, password);
        if (!user) return null;
        await getRedis().exec(["DEL", key]);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
