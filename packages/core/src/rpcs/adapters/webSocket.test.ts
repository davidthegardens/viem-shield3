import { assertType, describe, expect, test } from 'vitest'

import * as chains from '../../chains'
import { wait } from '../../utils/wait'

import { webSocket } from './webSocket'

test('default', () => {
  const adapter = webSocket({
    chain: chains.local,
  })

  assertType<'network'>(adapter.config.type)
  expect(adapter).toMatchInlineSnapshot(`
    {
      "config": {
        "key": "webSocket",
        "name": "WebSocket JSON-RPC",
        "request": [Function],
        "type": "network",
      },
      "value": {
        "chain": {
          "blockTime": 1000,
          "id": 1337,
          "name": "Localhost",
          "network": "localhost",
          "rpcUrls": {
            "default": {
              "http": "http://127.0.0.1:8545",
              "webSocket": "ws://127.0.0.1:8545",
            },
            "local": {
              "http": "http://127.0.0.1:8545",
              "webSocket": "ws://127.0.0.1:8545",
            },
          },
        },
        "getSocket": [Function],
        "subscribe": [Function],
        "transportMode": "webSocket",
      },
    }
  `)
})

describe('config', () => {
  test('key', () => {
    const adapter = webSocket({
      chain: chains.local,
      key: 'mock',
    })

    expect(adapter).toMatchInlineSnapshot(`
      {
        "config": {
          "key": "mock",
          "name": "WebSocket JSON-RPC",
          "request": [Function],
          "type": "network",
        },
        "value": {
          "chain": {
            "blockTime": 1000,
            "id": 1337,
            "name": "Localhost",
            "network": "localhost",
            "rpcUrls": {
              "default": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
              "local": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
            },
          },
          "getSocket": [Function],
          "subscribe": [Function],
          "transportMode": "webSocket",
        },
      }
    `)
  })

  test('name', () => {
    const adapter = webSocket({
      chain: chains.local,
      name: 'Mock Adapter',
    })

    expect(adapter).toMatchInlineSnapshot(`
      {
        "config": {
          "key": "webSocket",
          "name": "Mock Adapter",
          "request": [Function],
          "type": "network",
        },
        "value": {
          "chain": {
            "blockTime": 1000,
            "id": 1337,
            "name": "Localhost",
            "network": "localhost",
            "rpcUrls": {
              "default": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
              "local": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
            },
          },
          "getSocket": [Function],
          "subscribe": [Function],
          "transportMode": "webSocket",
        },
      }
    `)
  })

  test('url', () => {
    const adapter = webSocket({
      chain: chains.local,
      url: 'https://mockapi.com/rpc',
    })

    expect(adapter).toMatchInlineSnapshot(`
      {
        "config": {
          "key": "webSocket",
          "name": "WebSocket JSON-RPC",
          "request": [Function],
          "type": "network",
        },
        "value": {
          "chain": {
            "blockTime": 1000,
            "id": 1337,
            "name": "Localhost",
            "network": "localhost",
            "rpcUrls": {
              "default": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
              "local": {
                "http": "http://127.0.0.1:8545",
                "webSocket": "ws://127.0.0.1:8545",
              },
            },
          },
          "getSocket": [Function],
          "subscribe": [Function],
          "transportMode": "webSocket",
        },
      }
    `)
  })
})

test('getSocket', async () => {
  const rpc = webSocket({
    chain: chains.local,
  })
  const socket = await rpc.value?.getSocket()
  expect(socket).toBeDefined()
  expect(socket?.readyState).toBe(WebSocket.OPEN)
})

/* eslint-disable import/namespace */
Object.keys(chains).forEach((key) => {
  if (key === 'local') return

  // @ts-expect-error – testing
  const chain = chains[key]
  if (!chain.rpcUrls.default.webSocket) return
  test(`request (${key})`, async () => {
    const adapter = webSocket({
      chain,
      url: chain.rpcUrls.default.webSocket,
    })

    expect(
      await adapter.config.request({ method: 'eth_blockNumber' }),
    ).toBeDefined()
  })
})

test('request (local)', async () => {
  const adapter = webSocket({
    chain: chains.local,
    key: 'jsonRpc',
    name: 'JSON RPC',
  })

  expect(
    await adapter.config.request({ method: 'eth_blockNumber' }),
  ).toBeDefined()
})
/* eslint-enable import/namespace */

test('subscribe', async () => {
  const rpc = webSocket({
    chain: chains.local,
    key: 'jsonRpc',
    name: 'JSON RPC',
  })
  if (!rpc.value) return

  let blocks: any[] = []
  const { subscriptionId, unsubscribe } = await rpc.value.subscribe({
    params: ['newHeads'],
    onData: (data) => blocks.push(data),
  })

  // Make sure we are subscribed.
  expect(subscriptionId).toBeDefined()

  // Make sure we are receiving blocks.
  await wait(2000)
  expect(blocks.length).toBe(2)

  // Make sure we unsubscribe.
  const { result } = await unsubscribe()
  expect(result).toBeDefined()

  // Make sure we are no longer receiving blocks.
  await wait(2000)
  expect(blocks.length).toBe(2)
})

test('throws on bogus subscription', async () => {
  const rpc = webSocket({
    chain: chains.local,
    key: 'jsonRpc',
    name: 'JSON RPC',
  })

  let errors: any[] = []
  await expect(() =>
    rpc.value?.subscribe({
      // @ts-expect-error - testing
      params: ['lol'],
      onData: () => null,
      onError: (err) => errors.push(err),
    }),
  ).rejects.toThrowError()
  expect(errors.length).toBeGreaterThan(0)
})

test('throws if no url is provided', () => {
  expect(() =>
    webSocket({
      chain: { ...chains.local, rpcUrls: { default: { http: '' } } },
    }),
  ).toThrow('url is required')
})
