// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:admin@csb.app'

// Base64url helpers
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidHeaders(endpoint: string): Promise<Record<string, string>> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp, sub: VAPID_SUBJECT }

  const te = new TextEncoder()
  const headerB64 = uint8ArrayToBase64url(te.encode(JSON.stringify(header)))
  const payloadB64 = uint8ArrayToBase64url(te.encode(JSON.stringify(payload)))
  const sigInput = `${headerB64}.${payloadB64}`

  const privateKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Try raw format
    const keyData = { kty: 'EC', crv: 'P-256', d: VAPID_PRIVATE_KEY, x: '', y: '' }
    return crypto.subtle.importKey('jwk', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  })

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    te.encode(sigInput)
  )

  const jwt = `${sigInput}.${uint8ArrayToBase64url(new Uint8Array(sig))}`

  return {
    Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/octet-stream',
    TTL: '86400',
  }
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const te = new TextEncoder()
  const payloadBytes = te.encode(payload)

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64urlToUint8Array(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authBytes = base64urlToUint8Array(auth)

  // HKDF extract + expand
  const ikm = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey', 'deriveBits'])

  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: te.encode('Content-Encoding: auth\0') },
    ikm,
    256
  )

  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveKey', 'deriveBits'])

  const keyInfo = new Uint8Array([
    ...te.encode('Content-Encoding: aesgcm\0'),
    0x00, 0x41,
    ...base64urlToUint8Array(p256dh),
    0x00, 0x41,
    ...serverPublicKeyRaw,
  ])

  const nonceInfo = new Uint8Array([
    ...te.encode('Content-Encoding: nonce\0'),
    0x00, 0x41,
    ...base64urlToUint8Array(p256dh),
    0x00, 0x41,
    ...serverPublicKeyRaw,
  ])

  const contentEncryptionKey = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo },
    prkKey,
    128
  )

  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey,
    96
  )

  const aesKey = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, ['encrypt'])

  const paddedPayload = new Uint8Array(payloadBytes.length + 2)
  paddedPayload.set([0, 0])
  paddedPayload.set(payloadBytes, 2)

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload)
  )

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw }
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  try {
    const payloadStr = JSON.stringify(payload)
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      payloadStr,
      subscription.p256dh,
      subscription.auth
    )

    const headers = await makeVapidHeaders(subscription.endpoint)
    headers['Content-Encoding'] = 'aesgcm'
    headers['Encryption'] = `salt=${uint8ArrayToBase64url(salt)}`
    headers['Crypto-Key'] = `dh=${uint8ArrayToBase64url(serverPublicKey)};vapid=${headers.Authorization.split('vapid ')[1]}`
    headers['Content-Type'] = 'application/octet-stream'
    delete headers.Authorization
    headers.Authorization = `vapid t=${headers.Authorization?.split('t=')[1]?.split(',')[0]},k=${VAPID_PUBLIC_KEY}`

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: ciphertext,
    })

    return response.ok || response.status === 201
  } catch (err) {
    console.error('Push send error:', err)
    return false
  }
}

serve(async req => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_ids, payload } = await req.json()

    if (!user_ids?.length || !payload) {
      return new Response(JSON.stringify({ error: 'Missing user_ids or payload' }), { status: 400 })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids)

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    let sent = 0
    const deadSubs: string[] = []

    for (const sub of subs) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      )
      if (ok) {
        sent++
      } else {
        deadSubs.push(sub.id)
      }
    }

    // Remove dead subscriptions
    if (deadSubs.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadSubs)
    }

    return new Response(JSON.stringify({ sent }), { status: 200 })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
