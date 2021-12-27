import { Prices } from "@app"
import { getRecentlyActiveAccounts } from "@app/accounts/active-accounts"
import { toSats } from "@domain/bitcoin"
import { sendBalanceToUsers } from "@servers/daily-balance-notification"
import * as serviceLedger from "@services/ledger"
import { ledger } from "@services/mongodb"

jest.mock("@services/notifications/notification")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sendNotification } = require("@services/notifications/notification")

let price, spy

beforeAll(async () => {
  price = await Prices.getCurrentPrice()
  if (price instanceof Error) throw price

  const ledgerService = serviceLedger.LedgerService()

  spy = jest.spyOn(serviceLedger, "LedgerService").mockImplementation(() => ({
    ...ledgerService,
    allTxVolumeSince: async () => ({
      outgoingSats: toSats(1000),
      incomingSats: toSats(1000),
    }),
  }))
})

afterAll(() => {
  spy.mockClear()
  // jest.restoreAllMocks()
})

describe("notification", () => {
  describe("sendNotification", () => {
    it("sends daily balance to active users", async () => {
      await sendBalanceToUsers()
      const users = await getRecentlyActiveAccounts()
      if (users instanceof Error) throw users
      const numActiveUsers = users.length
      expect(sendNotification.mock.calls.length).toBe(numActiveUsers)
      for (const [call] of sendNotification.mock.calls) {
        const balance = await ledger.getWalletBalance(call.user.walletPath)

        const expectedUsdBalance = (price * balance).toLocaleString("en", {
          maximumFractionDigits: 2,
        })
        const expectedSatsBalance = balance.toLocaleString("en", {
          maximumFractionDigits: 2,
        })
        expect(call.title).toBe(
          `Your balance is $${expectedUsdBalance} (${expectedSatsBalance} ${balance} sats)`,
        )
      }
    })
  })
})