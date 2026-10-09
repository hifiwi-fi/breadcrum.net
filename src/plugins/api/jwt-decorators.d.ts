import '@fastify/jwt'
import 'fastify'
import { JwtUser, JwtUserWithTokenId, AuthTokenSource } from './jwt.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUserWithTokenId; // payload type is used for signing and verifying
    user: JwtUserWithTokenId; // user type is return type of `request.user` object
  }
}

declare module 'fastify' {
  interface FastifyReply {
    /**
     * Creates a JWT token for the given user.
     *
     * @param user - The user object containing the username and id.
     * @returns The generated JWT token.
     * @throws If no jti is returned when creating an auth token.
     */
    createJWTToken(user: JwtUser, source: AuthTokenSource): Promise<string>;

    /**
     * Sets a JWT cookie from the given token.
     *
     * @param token - The JWT token to set as a cookie.
     */
    setJWTCookie(token: string): void;

    /**
     * Clears the JWT cookie.
     */
    deleteJWTCookie(): void;
  }

  interface FastifyInstance {
    /**
     * Verifies the JWT token in the request.
     *
     * @param request - The Fastify request object.
     * @throws If the JWT verification fails.
     */
    verifyJWT(request: FastifyRequest): Promise<void>;
  }
}
