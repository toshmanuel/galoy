import crypto from "crypto"

import { MS_PER_DAY } from "@config"

import {
  AmountCalculator,
  BtcWalletDescriptor,
  UsdWalletDescriptor,
  WalletCurrency,
} from "@domain/shared"
import { LedgerTransactionType } from "@domain/ledger"

import { LedgerService } from "@services/ledger"

import {
  recordIntraLedgerPayment,
  recordReceivePayment,
  recordSendLnPayment,
} from "./helpers"

const ledgerService = LedgerService()
const calc = AmountCalculator()

describe("Withdrawal volumes", () => {
  const timestamp1DayAgo = new Date(Date.now() - MS_PER_DAY)
  const walletDescriptor = BtcWalletDescriptor(crypto.randomUUID() as WalletId)
  const walletDescriptorReceive = UsdWalletDescriptor(crypto.randomUUID() as WalletId)

  const sendAmount = {
    usd: { amount: 20n, currency: WalletCurrency.Usd },
    btc: { amount: 40n, currency: WalletCurrency.Btc },
  }
  const bankFee = {
    usd: { amount: 10n, currency: WalletCurrency.Usd },
    btc: { amount: 20n, currency: WalletCurrency.Btc },
  }

  const withdrawalTypes: LedgerTransactionTypeKey[] = ["Payment", "OnchainPayment"]
  const nonWithdrawalTypes = Object.keys(LedgerTransactionType)
    .map((key) => key as LedgerTransactionTypeKey)
    .filter((key: LedgerTransactionTypeKey) => !withdrawalTypes.includes(key))
  console.log(nonWithdrawalTypes)

  const fetchWithdrawalVolumeAmount = async <S extends WalletCurrency>(
    walletDescriptor: WalletDescriptor<S>,
  ): Promise<PaymentAmount<S>> => {
    const walletVolume = await ledgerService.externalPaymentVolumeSince({
      walletId: walletDescriptor.id,
      timestamp: timestamp1DayAgo,
    })
    expect(walletVolume).not.toBeInstanceOf(Error)
    if (walletVolume instanceof Error) throw walletVolume

    const walletVolumeAmount = await ledgerService.externalPaymentVolumeAmountSince({
      walletDescriptor,
      timestamp: timestamp1DayAgo,
    })
    expect(walletVolumeAmount).not.toBeInstanceOf(Error)
    if (walletVolumeAmount instanceof Error) throw walletVolumeAmount

    const { outgoingBaseAmount: outgoingBase } = walletVolume
    const { outgoingBaseAmount } = walletVolumeAmount
    expect(outgoingBase).toEqual(Number(outgoingBaseAmount.amount))

    return outgoingBaseAmount
  }

  it("correctly registers withdrawal transactions amount", async () => {
    const outgoingBaseAmountStart = await fetchWithdrawalVolumeAmount(walletDescriptor)

    // TODO: Add txn for OnChain payment type
    await recordSendLnPayment({
      walletDescriptor,
      paymentAmount: sendAmount,
      bankFee,
    })

    const outgoingBaseAmountEnd = await fetchWithdrawalVolumeAmount(walletDescriptor)
    expect(outgoingBaseAmountEnd).toStrictEqual(
      calc.add(outgoingBaseAmountStart, sendAmount.btc),
    )
  })

  it("correctly ignores all other transaction types", async () => {
    const outgoingBaseAmountStart = await fetchWithdrawalVolumeAmount(walletDescriptor)

    // TODO: Add txns for all other non-withdrawal payment types
    await recordReceivePayment({
      walletDescriptor,
      paymentAmount: sendAmount,
      bankFee,
    })

    await recordIntraLedgerPayment({
      senderWalletDescriptor: walletDescriptor,
      recipientWalletDescriptor: walletDescriptorReceive,
      paymentAmount: sendAmount,
    })

    const outgoingBaseAmountEnd = await fetchWithdrawalVolumeAmount(walletDescriptor)
    expect(outgoingBaseAmountEnd).toStrictEqual(outgoingBaseAmountStart)
  })
})
