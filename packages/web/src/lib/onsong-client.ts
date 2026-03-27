import Bonjour from 'bonjour-service'

const DISCOVERY_TIMEOUT_MS = 5000

// Module-level cache — survives across requests for the lifetime of the server process
let cachedHost: string | null = null
let cachedToken: string | null = null

function getConfig() {
  const uuid = process.env.ONSONG_CLIENT_UUID
  const apiKey = process.env.ONSONG_API_KEY
  const port = process.env.ONSONG_PORT ?? '5076'
  if (!uuid) throw new Error('ONSONG_CLIENT_UUID is not set')
  if (!apiKey) throw new Error('ONSONG_API_KEY is not set')
  return { uuid, apiKey, port }
}

function discoverHost(port: string): Promise<string> {
  if (cachedHost) return Promise.resolve(cachedHost)

  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour()
    const timer = setTimeout(() => {
      browser.stop()
      bonjour.destroy()
      reject(new Error('No OnSong device found on the network (timed out after 5s)'))
    }, DISCOVERY_TIMEOUT_MS)

    const browser = bonjour.find({ type: 'onsongapp' }, (service) => {
      clearTimeout(timer)
      browser.stop()
      bonjour.destroy()
      const host = service.addresses?.[0] ?? service.host
      cachedHost = host
      resolve(host)
    })
  })
}

async function getToken(host: string, port: string, uuid: string, apiKey: string): Promise<string> {
  if (cachedToken) return cachedToken

  const url = `http://${host}:${port}/api/${uuid}/auth`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, name: 'midigen' }),
  })

  if (!res.ok) {
    throw new Error(`OnSong auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { token?: string }
  const token = data.token ?? uuid
  cachedToken = token
  return token
}

export async function publishMidi(title: string, midiBuffer: Buffer): Promise<void> {
  const { uuid, apiKey, port } = getConfig()

  const host = await discoverHost(port)
  const token = await getToken(host, port, uuid, apiKey)

  const filename = `${title}.mid`

  // TODO: confirm endpoint path against a live device — /media is per the API docs;
  // the HTML example in the docs uses /media/import as the form action instead.
  const url = `http://${host}:${port}/api/${token}/media`

  const form = new FormData()
  form.append('file1', new Blob([midiBuffer], { type: 'audio/midi' }), filename)

  const res = await fetch(url, { method: 'POST', body: form })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OnSong media upload failed: ${res.status} ${text}`)
  }

  const data = await res.json() as { success?: boolean; error?: string }
  if (!data.success) {
    throw new Error(`OnSong media upload error: ${data.error ?? 'unknown'}`)
  }
}

/** Call this to force re-discovery on the next publish (e.g. if the device IP changed). */
export function clearOnSongCache() {
  cachedHost = null
  cachedToken = null
}
