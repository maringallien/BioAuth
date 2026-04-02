import { z } from 'zod';

// Describes a valid username
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(64, 'Username must be at most 64 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores');

export const registrationOptionsSchema = z.object({
  username: usernameSchema,
});

export const authenticationOptionsSchema = z.object({
  username: usernameSchema.optional(),
});

// Shape of the object the browser returns after the user completes a biometric prompt
export const registrationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    attestationObject: z.string(),
    transports: z.array(z.string()).optional(),
  }),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.unknown()).optional(),
  type: z.literal('public-key'),
});

// Shape of the object the browser returns after the user proves ownership of previously registered passkey
export const authenticationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().optional(),
  }),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.unknown()).optional(),
  type: z.literal('public-key'),
});

export const credentialIdParamSchema = z.object({
  id: z.string().min(1),
});
