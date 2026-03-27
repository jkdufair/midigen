import Bonjour from 'bonjour-service'

const DISCOVERY_TIMEOUT_MS = 10000

// Module-level cache — survives across requests for the lifetime of the server process
let cachedHost: string | null = null
let cachedPort: number | null = null
let cachedToken: string | null = null

function getConfig() {
  const uuid = process.env.ONSONG_CLIENT_UUID
  const apiKey = process.env.ONSONG_API_KEY
  if (!uuid) throw new Error('ONSONG_CLIENT_UUID is not set')
  if (!apiKey) throw new Error('ONSONG_API_KEY is not set')
  return { uuid, apiKey }
}

function discoverDevice(): Promise<{ host: string; port: number }> {
  if (cachedHost && cachedPort) return Promise.resolve({ host: cachedHost, port: cachedPort })

  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour()

    const timer = setTimeout(() => {
      try { browser.stop() } catch {}
      try { bonjour.destroy() } catch {}
      reject(new Error(`No OnSong device found on the network (timed out after ${DISCOVERY_TIMEOUT_MS / 1000}s)`))
    }, DISCOVERY_TIMEOUT_MS)

    const browser = bonjour.find({ type: 'onsongapp' }, (service) => {
      clearTimeout(timer)
      try { browser.stop() } catch {}
      try { bonjour.destroy() } catch {}
      const ipv4 = service.addresses?.find((a: string) => /^\d+\.\d+\.\d+\.\d+$/.test(a))
      const host = ipv4 ?? service.addresses?.[0] ?? service.host
      const port = 80
      cachedHost = host
      cachedPort = port
      resolve({ host, port })
    })
  })
}

async function getToken(host: string, port: number, uuid: string, apiKey: string): Promise<string> {
  if (cachedToken) return cachedToken

  const url = `http://${host}:${port}/api/${uuid}/auth`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, name: 'midigen' }),
  })

  if (!res.ok) {
    const text = await res.text()

    // TODO: manually test this "Not Accepting Users" retry flow with a real iPad
    // OnSong shows a prompt on the iPad — retry until accepted
    if (text.includes('Not Accepting Users')) {
      const maxRetries = 20
      for (let i = 1; i <= maxRetries; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const retry = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: apiKey, name: 'midigen' }),
        })
        if (retry.ok) {
          const retryData = await retry.json() as { token?: string }
          const t = retryData.token ?? uuid
          cachedToken = t
          return t
        }
        const retryText = await retry.text()
        if (!retryText.includes('Not Accepting Users')) {
          throw new Error(`OnSong auth failed: ${retry.status} ${retryText}`)
        }
      }
      throw new Error('OnSong auth timed out — user did not accept on iPad')
    }

    throw new Error(`OnSong auth failed: ${res.status} ${text}`)
  }

  const data = await res.json() as { token?: string }
  const token = data.token ?? uuid
  cachedToken = token
  return token
}

export async function publishMidi(title: string, midiBuffer: Buffer): Promise<void> {
  const { uuid, apiKey } = getConfig()

  const { host, port } = await discoverDevice()
  const token = await getToken(host, port, uuid, apiKey)

  const filename = `${title}.mid`
  const url = `http://${host}:${port}/api/${token}/songs/import`

  const form = new FormData()
  form.append('file1', new Blob([midiBuffer], { type: 'audio/midi' }), filename)

  const res = await fetch(url, { method: 'POST', body: form })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OnSong upload failed: ${res.status} ${text}`)
  }
}

/** Call this to force re-discovery on the next publish (e.g. if the device IP changed). */
export function clearOnSongCache() {
  cachedHost = null
  cachedPort = null
  cachedToken = null
}
