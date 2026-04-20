// AWS Signature V4 signing for Cloudflare Workers (no SDK needed)

export async function signRequest(url, method, body, env) {
  const u = new URL(url);
  const now = new Date();
  const date = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateStamp = date.slice(0, 8);
  const region = env.AWS_REGION;
  const service = 'bedrock';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256Hex(body);
  const headers = {
    host: u.host,
    'x-amz-date': date,
    'content-type': 'application/json',
  };

  const signedHeaderKeys = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');
  const canonicalPath = u.pathname.split('/').map(s => encodeURIComponent(decodeURIComponent(s))).join('/');
  const canonicalRequest = [method, canonicalPath, '', canonicalHeaders, signedHeaderKeys, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', date, scope, await sha256Hex(canonicalRequest)].join('\n');

  const signingKey = await getSignatureKey(env.AWS_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  headers['authorization'] = `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;
  return headers;
}

async function getSignatureKey(key, dateStamp, region, service) {
  let k = await hmacSign(new TextEncoder().encode('AWS4' + key), dateStamp);
  k = await hmacSign(k, region);
  k = await hmacSign(k, service);
  return await hmacSign(k, 'aws4_request');
}

async function hmacSign(key, msg) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}

async function hmacHex(key, msg) {
  const sig = await hmacSign(key, msg);
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(msg) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
