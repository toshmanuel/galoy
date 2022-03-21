import { LedgerTransactionType } from "@domain/ledger"
import {
  LnIntraledgerLedgerMetadata,
  OnChainIntraledgerLedgerMetadata,
  WalletIdIntraledgerLedgerMetadata,
} from "@services/ledger/tx-metadata"

describe("Tx metadata", () => {
  const senderUsername = "sender" as Username
  const recipientUsername = "receiver" as Username
  const memoOfPayer = "sample payer memo"
  const pubkey = "pubkey" as Pubkey
  const payeeAddresses: OnChainAddress[] = ["Address" as OnChainAddress]
  const paymentHash = "paymenthash" as PaymentHash
  const amountDisplayCurrency = 10 as DisplayCurrencyBaseAmount

  describe("intraledger", () => {
    it("onchain", () => {
      const { metadata, debitAccountAdditionalMetadata } =
        OnChainIntraledgerLedgerMetadata({
          amountDisplayCurrency,
          payeeAddresses,
          sendAll: true,
          memoOfPayer,
          senderUsername,
          recipientUsername,
        })

      expect(metadata.username).toEqual(senderUsername)
      expect(debitAccountAdditionalMetadata.username).toEqual(recipientUsername)
      expect(metadata.memoPayer).toBeUndefined()
      expect(debitAccountAdditionalMetadata.memoPayer).toEqual(memoOfPayer)
      expect(metadata.type).toEqual(LedgerTransactionType.OnchainIntraLedger)
    })

    it("ln", () => {
      const { metadata, debitAccountAdditionalMetadata } = LnIntraledgerLedgerMetadata({
        amountDisplayCurrency,
        memoOfPayer,
        senderUsername,
        recipientUsername,
        pubkey,
        paymentHash,
      })

      expect(metadata.username).toEqual(senderUsername)
      expect(debitAccountAdditionalMetadata.username).toEqual(recipientUsername)
      expect(metadata.memoPayer).toBeUndefined()
      expect(debitAccountAdditionalMetadata.memoPayer).toEqual(memoOfPayer)
      expect(metadata.type).toEqual(LedgerTransactionType.LnIntraLedger)
    })

    it("wallet id", () => {
      const { metadata, debitAccountAdditionalMetadata } =
        WalletIdIntraledgerLedgerMetadata({
          amountDisplayCurrency,
          memoOfPayer,
          senderUsername,
          recipientUsername,
        })

      expect(metadata.username).toEqual(senderUsername)
      expect(debitAccountAdditionalMetadata.username).toEqual(recipientUsername)
      expect(metadata.memoPayer).toEqual(memoOfPayer)
    })
  })
})
