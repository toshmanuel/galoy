import { defaultTimeToExpiryInSeconds } from "@domain/bitcoin/lightning/invoice-expiration"

export const AmountConverter = ({
  dealerFns,
}: AmountConverterConfig): AmountConverter => {
  const addAmountsForFutureBuy = async <S extends WalletCurrency>(
    builder: LightningPaymentFlowBuilder<S>,
  ): Promise<LightningPaymentFlowBuilder<S> | DealerPriceServiceError> => {
    const btcAmount = builder.btcPaymentAmount()
    if (btcAmount === undefined) {
      const usdAmount = builder.usdPaymentAmount()
      if (usdAmount === undefined) {
        throw Error("No amount specified")
      }
      const updatedBtcAmount = await dealerFns.getSatsFromCentsForFutureBuy(
        usdAmount,
        defaultTimeToExpiryInSeconds,
      )
      if (updatedBtcAmount instanceof Error) return updatedBtcAmount

      // TODO don't forget to set expiry time
      return builder.withBtcAmount(updatedBtcAmount)
    }

    return builder.withBtcAmount(btcAmount)
  }
  return {
    addAmountsForFutureBuy,
  }
}