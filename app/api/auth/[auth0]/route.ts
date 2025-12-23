import { initAuth0 } from '@auth0/nextjs-auth0';

const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET!,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,
  baseURL: process.env.AUTH0_BASE_URL!,
  clientID: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

export const GET = auth0.handleAuth();
export const POST = auth0.handleAuth();
