import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();

describe("Claim Test", () => {
  it("can disperse funds equally", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = `${simnet.deployer}.smart-claimant`;
    const wallet1 = accounts.get("wallet_1")!;
    const wallet2 = accounts.get("wallet_2")!;
    const wallet3 = accounts.get("wallet_3")!;
    const wallet4 = accounts.get("wallet_4")!;
    const unlock_height = 10;
    const amount = 1000;
    const share = Math.floor(amount / 4);

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(unlock_height), Cl.uint(amount)],
      deployer
    );

    expect(lockTx.result).toBeOk(Cl.bool(true));
    expect(lockTx.events).toHaveLength(1);

    simnet.mineEmptyBlocks(unlock_height);

    const claimTx = simnet.callPublicFn(
      "smart-claimant",
      "claim",
      [],
      deployer
    );
    expect(claimTx.result).toBeOk(Cl.bool(true));
    expect(claimTx.events).toHaveLength(5);
    const claimEvents = claimTx.events;

    expect(claimEvents[1].data.recipient).toBe(wallet1);
    expect(claimEvents[2].data.recipient).toBe(wallet2);
    expect(claimEvents[3].data.recipient).toBe(wallet3);
    expect(claimEvents[4].data.recipient).toBe(wallet4);

    expect(claimEvents[1].data.amount).toBe(share.toString());
    expect(claimEvents[2].data.amount).toBe(share.toString());
    expect(claimEvents[3].data.amount).toBe(share.toString());
    // if amount mod 4 != 0 the last claimant will receive little more
    if (amount % 4 != 0) {
      expect(Number(claimEvents[4].data.amount)).toBeGreaterThan(share);
    } else {
      expect(claimEvents[4].data.amount).toBe(share.toString());
    }
  });
});
