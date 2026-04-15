// ═══ SIGNAGE CLIENT — Interface abstraite pour digital signage MQTT/HTTP (M19) ═══
// Trois backends possibles :
//  1. 'mock' — broker en mémoire, survit le temps de la session (dev local)
//  2. 'http' — POST vers endpoint REST avec batching
//  3. 'mqtt' — via mqtt.js (chargé à la demande si broker configuré)
//
// Sélection auto : mqtt si URL wss://, http si https://, sinon mock.

export interface SignageMessage {
  /** Panneau cible (topic MQTT ou deviceId REST). */
  deviceId: string
  /** Type d'action. */
  kind: 'display-image' | 'display-text' | 'display-html' | 'clear' | 'brightness' | 'reboot'
  /** Payload spécifique. */
  payload: Record<string, unknown>
  /** Durée d'affichage en secondes (défaut : permanent). */
  durationSec?: number
  /** Priorité (1 = urgent, 5 = background). */
  priority?: 1 | 2 | 3 | 4 | 5
}

export interface DeviceStatus {
  deviceId: string
  online: boolean
  lastSeenAt: string
  firmwareVersion?: string
  brightness?: number
  currentContent?: string
}

export interface SignageClient {
  connect(): Promise<void>
  disconnect(): Promise<void>
  publish(msg: SignageMessage): Promise<void>
  publishMany(msgs: SignageMessage[]): Promise<void>
  /** Abonne une callback aux statuts des devices (heartbeats). */
  onStatus(handler: (status: DeviceStatus) => void): () => void
  listDevices(): Promise<DeviceStatus[]>
  mode: 'mock' | 'http' | 'mqtt'
}

// ─── Mock client (broker in-memory) ───────────────────────

class MockSignageClient implements SignageClient {
  mode = 'mock' as const
  private devices = new Map<string, DeviceStatus>()
  private handlers = new Set<(s: DeviceStatus) => void>()
  private timer: ReturnType<typeof setInterval> | null = null

  async connect(): Promise<void> {
    // Simule 3 panneaux
    const ids = ['sign-rdc-1', 'sign-rdc-2', 'sign-r1-1']
    for (const id of ids) {
      this.devices.set(id, {
        deviceId: id, online: true,
        lastSeenAt: new Date().toISOString(),
        firmwareVersion: '1.4.2',
        brightness: 80,
      })
    }
    // Heartbeat toutes les 30s
    this.timer = setInterval(() => {
      for (const d of this.devices.values()) {
        d.lastSeenAt = new Date().toISOString()
        for (const h of this.handlers) h(d)
      }
    }, 30_000)
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.handlers.clear()
  }

  async publish(msg: SignageMessage): Promise<void> {
    const d = this.devices.get(msg.deviceId)
    if (!d) throw new Error(`Device unknown: ${msg.deviceId}`)
    switch (msg.kind) {
      case 'display-image':
      case 'display-html':
      case 'display-text':
        d.currentContent = `${msg.kind}: ${JSON.stringify(msg.payload).slice(0, 60)}`
        break
      case 'clear':
        d.currentContent = undefined
        break
      case 'brightness':
        d.brightness = Number(msg.payload.value ?? 80)
        break
      case 'reboot':
        d.online = false
        setTimeout(() => { d.online = true; d.lastSeenAt = new Date().toISOString() }, 2000)
        break
    }
    for (const h of this.handlers) h(d)
  }

  async publishMany(msgs: SignageMessage[]): Promise<void> {
    for (const m of msgs) await this.publish(m)
  }

  onStatus(handler: (s: DeviceStatus) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  async listDevices(): Promise<DeviceStatus[]> {
    return Array.from(this.devices.values())
  }
}

// ─── HTTP client (REST API) ───────────────────────────────

class HttpSignageClient implements SignageClient {
  mode = 'http' as const
  private handlers = new Set<(s: DeviceStatus) => void>()
  constructor(private baseUrl: string, private apiKey?: string) {}

  async connect(): Promise<void> { /* stateless */ }
  async disconnect(): Promise<void> { this.handlers.clear() }

  private async req(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  }

  async publish(msg: SignageMessage): Promise<void> {
    const res = await this.req(`/devices/${encodeURIComponent(msg.deviceId)}/commands`, {
      method: 'POST',
      body: JSON.stringify(msg),
    })
    if (!res.ok) throw new Error(`Signage HTTP publish failed: ${res.status}`)
  }

  async publishMany(msgs: SignageMessage[]): Promise<void> {
    const res = await this.req('/commands/batch', {
      method: 'POST',
      body: JSON.stringify({ messages: msgs }),
    })
    if (!res.ok) throw new Error(`Signage HTTP batch failed: ${res.status}`)
  }

  onStatus(handler: (s: DeviceStatus) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  async listDevices(): Promise<DeviceStatus[]> {
    const res = await this.req('/devices')
    if (!res.ok) throw new Error(`Signage HTTP list failed: ${res.status}`)
    return await res.json()
  }
}

// ─── MQTT client (chargé à la demande) ────────────────────

class MqttSignageClient implements SignageClient {
  mode = 'mqtt' as const
  private client: any = null
  private handlers = new Set<(s: DeviceStatus) => void>()
  private devices = new Map<string, DeviceStatus>()
  constructor(private brokerUrl: string, private topic = 'signage') {}

  async connect(): Promise<void> {
    // Dynamique : mqtt n'est pas dans les deps obligatoires
    let mqttLib: any
    try {
      mqttLib = await import('mqtt')
    } catch {
      throw new Error('Package "mqtt" non installé — npm install mqtt')
    }
    this.client = mqttLib.connect(this.brokerUrl)
    await new Promise((resolve, reject) => {
      this.client.once('connect', resolve)
      this.client.once('error', reject)
      setTimeout(() => reject(new Error('MQTT connect timeout')), 10_000)
    })
    this.client.subscribe(`${this.topic}/+/status`)
    this.client.on('message', (topic: string, payload: Buffer) => {
      try {
        const deviceId = topic.split('/')[1]
        const data = JSON.parse(payload.toString())
        const status: DeviceStatus = {
          deviceId,
          online: data.online ?? true,
          lastSeenAt: new Date().toISOString(),
          firmwareVersion: data.firmware,
          brightness: data.brightness,
          currentContent: data.content,
        }
        this.devices.set(deviceId, status)
        for (const h of this.handlers) h(status)
      } catch { /* skip */ }
    })
  }

  async disconnect(): Promise<void> {
    if (this.client) await new Promise(resolve => this.client.end(false, {}, resolve))
    this.client = null
    this.handlers.clear()
  }

  async publish(msg: SignageMessage): Promise<void> {
    if (!this.client) throw new Error('MQTT not connected')
    const topic = `${this.topic}/${msg.deviceId}/cmd`
    await new Promise((res, rej) => {
      this.client.publish(topic, JSON.stringify(msg), { qos: 1 }, (err: Error | undefined) =>
        err ? rej(err) : res(undefined))
    })
  }

  async publishMany(msgs: SignageMessage[]): Promise<void> {
    for (const m of msgs) await this.publish(m)
  }

  onStatus(handler: (s: DeviceStatus) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  async listDevices(): Promise<DeviceStatus[]> {
    return Array.from(this.devices.values())
  }
}

// ─── Factory ──────────────────────────────────────────────

export interface SignageConfig {
  brokerUrl?: string
  httpBaseUrl?: string
  apiKey?: string
  topic?: string
}

export function createSignageClient(cfg: SignageConfig = {}): SignageClient {
  if (cfg.brokerUrl?.startsWith('mqtt') || cfg.brokerUrl?.startsWith('wss://') || cfg.brokerUrl?.startsWith('ws://')) {
    return new MqttSignageClient(cfg.brokerUrl, cfg.topic)
  }
  if (cfg.httpBaseUrl?.startsWith('http')) {
    return new HttpSignageClient(cfg.httpBaseUrl, cfg.apiKey)
  }
  return new MockSignageClient()
}

// ─── Helper : pousser les POIs du parcours aux panneaux ───

export async function broadcastPois(
  client: SignageClient,
  pois: Array<{ id: string; label: string; deviceId: string; imageUrl?: string }>,
): Promise<void> {
  const msgs: SignageMessage[] = pois.map(p => ({
    deviceId: p.deviceId,
    kind: p.imageUrl ? 'display-image' : 'display-text',
    payload: p.imageUrl ? { url: p.imageUrl, alt: p.label } : { text: p.label },
    durationSec: 30,
    priority: 3,
  }))
  await client.publishMany(msgs)
}
