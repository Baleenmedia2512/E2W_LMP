import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  // NOTE: PrismaAdapter removed to prevent auto-creating users from Google OAuth
  // We manually handle user verification and account linking in callbacks
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    // Development-only credentials provider
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // In development, allow any of the seeded users with password "demo123"
        if (process.env.NODE_ENV === 'development' && credentials.password === 'demo123') {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { role: true },
          });

          if (user && user.isActive) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role.name,
              roleId: user.roleId,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle credentials provider (development only)
      if (account?.provider === 'credentials') {
        return true;
      }

      if (account?.provider === 'google') {
        if (!user.email) {
          return false;
        }

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        });

        if (!existingUser) {
          // User doesn't exist - DENY ACCESS
          console.log(`Access denied for unregistered email: ${user.email}`);
          return '/auth/error?error=NotRegistered';
        }

        // User exists - update googleId if not set
        if (!existingUser.googleId) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              googleId: account.providerAccountId,
            },
          });
        }

        // Check if user is active
        if (!existingUser.isActive) {
          console.log(`Access denied for inactive user: ${user.email}`);
          return '/auth/error?error=AccountInactive';
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.roleId = token.roleId as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Handle Google OAuth login
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        });

        if (dbUser) {
          // Link Google account if not already linked
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: 'google',
              providerAccountId: account.providerAccountId,
            },
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }

          // Set token data
          token.id = dbUser.id;
          token.role = dbUser.role.name;
          token.roleId = dbUser.roleId;
          token.isActive = dbUser.isActive;
        }
      }

      // Handle credentials login (role already set in authorize)
      if (user && !account) {
        token.id = user.id;
        token.role = user.role;
        token.roleId = user.roleId;
      }

      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};
