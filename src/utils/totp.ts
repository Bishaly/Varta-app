import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TotpSetupResult {
  secret: string;
  otpauthUri: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// Generate base32 random secret and setup package
export async function generateTotpSetup(
  username: string,
  issuer: string = 'CipherGram'
): Promise<TotpSetupResult> {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: issuer,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  const otpauthUri = totp.toString();
  const qrCodeUrl = await QRCode.toDataURL(otpauthUri, {
    width: 260,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  // Generate 6 recovery backup codes
  const backupCodes: string[] = [];
  for (let i = 0; i < 6; i++) {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    backupCodes.push(`${part1}-${part2}`);
  }

  return {
    secret: secret.base32,
    otpauthUri,
    qrCodeUrl,
    backupCodes,
  };
}

// Verify TOTP 6-digit token
export function verifyTotpToken(token: string, secretBase32: string): boolean {
  try {
    const cleanToken = token.replace(/\s+/g, '');
    if (cleanToken.length !== 6) return false;

    const totp = new OTPAuth.TOTP({
      issuer: 'CipherGram',
      label: 'User',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    // delta returns null if invalid, or number of window steps offset if valid
    const delta = totp.validate({
      token: cleanToken,
      window: 1, // Allow 1 step (30s) clock skew
    });

    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}
