import { sha256 } from 'js-sha256';
import { plaidClient } from './plaid-client';

/**
 * Verifies Plaid webhook JWT signature and body hash
 *
 * Follows Plaid's official webhook verification pattern:
 * 1. Extract kid from JWT header
 * 2. Fetch JWK from Plaid API
 * 3. Verify JWT signature with ES256
 * 4. Check timestamp (iat < 5 minutes old)
 * 5. Verify request body SHA-256 hash
 *
 * @param body - Raw request body as string
 * @param headers - Request headers containing plaid-verification JWT
 * @returns true if verification succeeds
 * @throws Error if verification fails
 */
export async function verifyPlaidWebhook(
  body: string,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const jose = await import('jose');
  // Extract the signed JWT from headers
  const signedJwt = headers['plaid-verification'];

  if (!signedJwt || typeof signedJwt !== 'string') {
    throw new Error('Missing plaid-verification header');
  }

  // Step 1: Decode JWT header to get kid (key ID) without verification
  const decodedHeader = jose.decodeProtectedHeader(signedJwt);
  const kid = decodedHeader.kid;

  if (!kid) {
    throw new Error('Missing kid in JWT header');
  }

  // Step 2: Fetch the JWK from Plaid using the kid
  const keyResponse = await plaidClient.webhookVerificationKeyGet({
    key_id: kid,
  });

  const jwk = keyResponse.data.key;

  // Step 3: Import the JWK as a public key
  const publicKey = await jose.importJWK(jwk, 'ES256');

  // Step 4: Verify the JWT signature
  const { payload } = await jose.jwtVerify(signedJwt, publicKey, {
    algorithms: ['ES256'],
  });

  // Step 5: Check timestamp - iat must be less than 5 minutes old
  const currentTime = Math.floor(Date.now() / 1000);
  const iat = payload.iat;

  if (!iat || typeof iat !== 'number') {
    throw new Error('Missing or invalid iat claim');
  }

  const fiveMinutesInSeconds = 5 * 60;
  if (currentTime - iat > fiveMinutesInSeconds) {
    throw new Error('JWT is too old (iat > 5 minutes)');
  }

  // Step 6: Verify request body hash
  const bodyHash = sha256(body);
  const claimedBodyHash = payload.request_body_sha256;

  if (bodyHash !== claimedBodyHash) {
    throw new Error('Request body hash mismatch');
  }

  return true;
}
