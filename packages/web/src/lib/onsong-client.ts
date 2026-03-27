import { spawn } from 'child_process'
import { lookup } from 'dns/promises'

const DISCOVERY_TIMEOUT_MS = 10000

interface OnSongDevice { host: string; port: number }
let discoveredDevice: OnSongDevice | null = null
let cachedToken: string | null = null

function getConfig() {
  const uuid = process.env.ONSONG_CLIENT_UUID
  const apiKey = process.env.ONSONG_API_KEY
  if (!uuid) throw new Error('ONSONG_CLIENT_UUID is not set')
  if (!apiKey) throw new Error('ONSONG_API_KEY is not set')
  return { uuid, apiKey }
}

function dnsSdBrowse(timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('dns-sd', ['-B', '_onsongapp._tcp', 'local'])
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error(`No OnSong device found on the network (timed out after ${timeoutMs / 1000}s)`))
    }, timeoutMs)

    proc.stdout.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        const match = line.match(/Add\s+\d+\s+\d+\s+\S+\s+\S+\s+(.+)$/)
        if (match) {
          const instanceName = match[1].trim()
          clearTimeout(timer)
          proc.kill()
          resolve(instanceName)
        }
      }
    })

    proc.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

function dnsSdLookup(instanceName: string): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('dns-sd', ['-L', instanceName, '_onsongapp._tcp', 'local'])
    const timer = setTimeout(() => { proc.kill(); reject(new Error('dns-sd lookup timed out')) }, 5000)

    proc.stdout.on('data', (data: Buffer) => {
      const match = data.toString().match(/can be reached at (.+?):(\d+)/)
      if (match) {
        clearTimeout(timer)
        proc.kill()
        resolve({ host: match[1].trim(), port: parseInt(match[2], 10) })
      }
    })

    proc.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

async function discoverDevice(): Promise<OnSongDevice> {
  if (discoveredDevice) return discoveredDevice

  const instanceName = await dnsSdBrowse(DISCOVERY_TIMEOUT_MS)
  const { host: rawHost } = await dnsSdLookup(instanceName)

  // Resolve .local hostname to IPv4 via system resolver (mDNSResponder on macOS)
  const cleanHost = rawHost.replace(/\.$/, '')
  const { address } = await lookup(cleanHost, { family: 4 })
  // The SRV record port is an internal OnSong protocol, not the HTTP API; the HTTP API is always on port 80
  discoveredDevice = { host: address, port: 80 }
  return discoveredDevice
}

async function getToken(host: string, port: number, uuid: string, apiKey: string): Promise<string> {
  if (cachedToken) return cachedToken

  const url = `http://${host}:${port}/api/${uuid}/auth`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, name: 'midigen' }),
    signal: AbortSignal.timeout(5000),
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
          signal: AbortSignal.timeout(5000),
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

/** Call this to force re-discovery on the next publish (e.g. if the device IP changed). */
export function clearOnSongCache() {
  discoveredDevice = null
  cachedToken = null
}

export async function publishMidi(title: string, midiBuffer: Buffer, tempo?: number): Promise<void> {
  const { uuid, apiKey } = getConfig()

  async function tryUpload(): Promise<{ baseUrl: string }> {
    const { host, port } = await discoverDevice()
    const token = await getToken(host, port, uuid, apiKey)
    const baseUrl = `http://${host}:${port}/api/${token}`

    const filename = `${title}.mid`
    const form = new FormData()
    form.append('file1', new Blob([new Uint8Array(midiBuffer)], { type: 'audio/midi' }), filename)

    const uploadRes = await fetch(`${baseUrl}/songs/import`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    })
    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      throw new Error(`OnSong upload failed: ${uploadRes.status} ${text}`)
    }
    return { baseUrl }
  }

  // Try once; on failure, clear cache (device may have changed IP) and retry
  let baseUrl: string
  try {
    ({ baseUrl } = await tryUpload())
  } catch {
    clearOnSongCache();
    ({ baseUrl } = await tryUpload())
  }

  // Set tempo on the song if provided
  if (tempo) {
    const songsRes = await fetch(`${baseUrl}/songs`, { signal: AbortSignal.timeout(5000) })
    if (songsRes.ok) {
      const data = await songsRes.json() as { results?: { ID: string; title: string }[] }
      const song = data.results?.find(s => s.title === title)
      if (song) {
        await fetch(`${baseUrl}/songs/${song.ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempo }),
          signal: AbortSignal.timeout(5000),
        })
      }
    }
  }
}
