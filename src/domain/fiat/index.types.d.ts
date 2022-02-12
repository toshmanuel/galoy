type UsdCents = number & { readonly brand: unique symbol }
type DisplayCurrencyBaseAmount = number & { readonly brand: unique symbol }

type CurrencyBaseAmount = Satoshis | UsdCents

interface DisplayCurrencyConverter {
  fromSats: (amount: Satoshis) => DisplayCurrencyBaseAmount
  fromCents: (amount: UsdCents) => DisplayCurrencyBaseAmount
  fromSatsToCents: (amount: Satoshis) => UsdCents
  fromCentsToSats: (amount: UsdCents) => Satoshis
}

interface AmountFromSatoshis {
  sats: Satoshis
}

interface AmountFromCents {
  cents: UsdCents
}

type XOR<T1, T2> =
  | (T1 & { [k in Exclude<keyof T2, keyof T1>]?: never })
  | (T2 & { [k in Exclude<keyof T1, keyof T2>]?: never })

type CentsXORSats = XOR<AmountFromSatoshis, AmountFromCents>

type OrderType =
  typeof import("./index").OrderType[keyof typeof import("./index").OrderType]

type GetAmountsSendOrReceiveArgs = {
  walletCurrency: WalletCurrency
  order: OrderType
} & CentsXORSats

type GetAmountsSendOrReceiveRet =
  | {
      amountDisplayCurrency: DisplayCurrencyBaseAmount
      sats: Satoshis
      cents?: UsdCents
    }
  | NotReachableError
  | NotImplementedError
  | DealerPriceServiceError
