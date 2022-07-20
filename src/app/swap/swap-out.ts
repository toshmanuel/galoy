import { BTC_NETWORK, getColdStorageConfig, getSwapConfig } from "@config"
import { TxDecoder } from "@domain/bitcoin/onchain"
import { SwapServiceError } from "@domain/swap/errors"
import { OnChainService } from "@services/lnd/onchain-service"
import { toSats } from "@domain/bitcoin"
import { SwapOutChecker } from "@domain/swap"
import { baseLogger } from "@services/logger"
import { SwapService } from "@services/swap"
import { getActiveLnd } from "@services/lnd/utils"
import { getChannelBalance } from "lightning"
import { addAttributesToCurrentSpan } from "@services/tracing"

const logger = baseLogger.child({ module: "swap" })

export const swapOut = async (
  amount: Satoshis,
): Promise<SwapOutResult | SwapServiceError> => {
  const swapService = SwapService()
  logger.info("SwapApp: Started")
  const onChainService = OnChainService(TxDecoder(BTC_NETWORK))
  if (onChainService instanceof Error) return onChainService

  const onChainBalance = await onChainService.getBalance()
  if (onChainBalance instanceof Error) return onChainBalance
  const outbound = await getChannelLiquidityBalance()
  const minOnChainHotWalletBalanceConfig =
    getColdStorageConfig().minOnChainHotWalletBalance
  const minOutboundLiquidityBalance = getSwapConfig().minOutboundLiquidityBalance

  const swapChecker = SwapOutChecker({
    currentOnChainHotWalletBalance: onChainBalance,
    minOnChainHotWalletBalanceConfig,
    currentOutboundLiquidityBalance: outbound,
    minOutboundLiquidityBalance,
  })
  const isOnChainWalletDepleted = swapChecker.isOnChainWalletDepleted()
  const isOutboundLiquidityDepleted = swapChecker.isOutboundLiquidityDepleted()
  logger.info(`SwapApp: isOnChainWalletDepleted: ${isOnChainWalletDepleted},
    isOutboundLiquidityDepleted: ${isOutboundLiquidityDepleted}`)

  addAttributesToCurrentSpan({
    "swap.isOutboundLiquidityDepleted": isOutboundLiquidityDepleted,
    "swap.isOnChainWalletDepleted": isOnChainWalletDepleted,
  })

  if (isOnChainWalletDepleted && isOutboundLiquidityDepleted) {
    const swapResult = await swapService.swapOut(toSats(amount))
    return swapResult
  } else {
    return new SwapServiceError("No Swap Out needed")
  }
}

async function getChannelLiquidityBalance(): Promise<Satoshis | Error> {
  try {
    const activeNode = getActiveLnd()
    if (activeNode instanceof Error) return activeNode
    const lnd = activeNode.lnd
    const { channel_balance, inbound } = await getChannelBalance({ lnd })
    let outbound = 0
    const inboundBal = inbound ? inbound : 0
    if (inbound) {
      outbound = channel_balance - inboundBal
    }
    return toSats(outbound)
  } catch (err) {
    return new Error(err)
  }
}
