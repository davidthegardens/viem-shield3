import {
  Shield3ConnectionError,
  Shield3PolicyViolationError,
} from '../../errors/shield3Errors.js'
import type { TransactionSerializable } from '../../types/transaction.js'
import { serializeTransaction } from '../../utils/transaction/serializeTransaction.js'

function parsePolicyResults(response: any) {
  const blockedPolicyNames =
    response.data.result.transaction.workflow_results.policyResults
      .filter(
        (policy: any) =>
          policy.policyDecision.toLowerCase() === 'block' ||
          policy.policyDecision.toLowerCase() === 'mfa',
      )
      .map((policy: any) => policy.name)
  return JSON.stringify(blockedPolicyNames)
}

async function callShield3(
  serializedUnsigned: any,
  fromAddress: string,
  chainId: string,
) {
  const apiKey = process.env.VITE_SHIELD3_API_KEY
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_simulateTransaction',
    params: [serializedUnsigned, fromAddress],
    id: 42,
  })

  const url = `https://rpc.shield3.com/v3/0x${chainId}/rpc?apiKey=${apiKey}`
  const headers = { 'Content-Type': 'application/json' }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: data,
    })
    if (!response.ok) {
      throw new Shield3ConnectionError('Could not connect to Shield3', {
        response: response.json(),
      })
    }
    const responseData = await response.json()
    console.log(responseData)
    if (responseData.data.result.decision !== 'Allow') {
      throw new Shield3PolicyViolationError(
        `Policy violation(s): ${parsePolicyResults(response)}`,
      )
    }
    return responseData
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function fortifySendTransaction<
  PreppedTx extends TransactionSerializable & { from: string },
>(populated_tx: PreppedTx): Promise<any> {
  if (process.env.VITE_SHIELD3_API_KEY === undefined) {
    console.log(
      "Your Shield3 api key is undefined. Add VITE_SHIELD3_API_KEY=your-api-key to your .env.local file in your project's root directory for added protection.",
    )
    return
  }

  const serializedUnsigned = serializeTransaction(populated_tx) // Assuming serializeTransaction exists and is compatible with this usage.
  return await callShield3(
    serializedUnsigned,
    populated_tx.from.toString(),
    populated_tx.chainId!.toString(16),
  )
}

export async function fortifySerializedTransaction(
  SerializedTransaction: string,
  ChaindId: string,
  fromAddress: string,
): Promise<any> {
  // const serializedTx = '0xf86c808504a817c80082520894c0ffee254729296a45a3885639ac7e10f9d54979b872386f26fc100008025a0b5e8b0f569de0c29e3e1b8c9d8618e73903c28a5a83f8cfd0f6f8cd10b8db79a071e2baa5a6f1b23839ece2762ca0b5a8e1b3b7c1b2b8322a70a2fc68af50e21ba';

  if (process.env.VITE_SHIELD3_API_KEY === undefined) {
    console.log(
      "Your Shield3 api key is undefined. Add VITE_SHIELD3_API_KEY=your-api-key to your .env.local file in your project's root directory for added protection.",
    )
    return
  }
  return await callShield3(SerializedTransaction, fromAddress, ChaindId)
}