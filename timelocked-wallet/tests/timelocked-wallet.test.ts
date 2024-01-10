import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();

describe("Test Locking Funds", () => {
  it("allows the contract owner to lock an amount", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const amount = 10;

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );

    expect(lockTx.result).toBeOk(Cl.bool(true));
    expect(lockTx.events).toHaveLength(1);

    const transferEvent = lockTx.events[0];
    expect(transferEvent.event).toBe("stx_transfer_event");
    expect(transferEvent.data.amount).toBe(amount.toString());
    expect(transferEvent.data.recipient).toBe(
      deployer.concat(".timelocked-wallet")
    );
    expect(transferEvent.data.sender).toBe(deployer);

    const beneficiary_principal = simnet.getDataVar(
      "timelocked-wallet",
      "beneficiary"
    );
    expect(beneficiary_principal).toBeSome(Cl.principal(beneficiary));
  });

  it("does not allow anyone else to lock an amount", () => {
    const beneficiary = accounts.get("wallet_1")!;
    const someone_else = accounts.get("wallet_2")!;
    const amount = 10;

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      someone_else
    );

    // expecting err-only-owner (err u100)
    expect(lockTx.result).toBeErr(Cl.uint(100));
  });

  it("cannot lock more than once", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const amount = 10;

    const lockTx1 = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );
    expect(lockTx1.result).toBeOk(Cl.bool(true));

    const lockTx2 = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );
    // expecting err-already-locked (err u101)
    expect(lockTx2.result).toBeErr(Cl.uint(101));
  });

  it("unlock height cannot be in the past", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const num_blocks_to_lock = 100;
    const amount = 10;

    expect(simnet.blockHeight).toBe(1);

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(num_blocks_to_lock), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true))

    // mine some blocks but not enough to unlock
    simnet.mineEmptyBlocks(20);
    expect(simnet.blockHeight).toBe(22);

    // attempt to unlock funds
    const claimTx = simnet.callPublicFn(
      "timelocked-wallet",
      "claim",
      [],
      beneficiary
    );

    // expecting err-too-soon (err u105)
    expect(claimTx.result).toBeErr(Cl.uint(105))

    // expecting no transfer events
    expect(claimTx.events).toHaveLength(0)
  });

  it("amount must be greater than zero", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const amount = 0;

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(50), Cl.uint(amount)],
      deployer
    );

    // expecting err-zero-deposit (err u103)
    expect(lockTx.result).toBeErr(Cl.uint(103))

    // expecting no transfer events
    expect(lockTx.events).toHaveLength(0)

  })
});

// Clarinet.test({
//   name: "Unlock height cannot be in the past",
//   async fn(chain: Chain, accounts: Map<string, Account>) {
//     const deployer = accounts.get("deployer")!;
//     const beneficiary = accounts.get("wallet_1")!;
//     const targetBlockHeight = 10;
//     const amount = 10;

//     // Advance the chain until the unlock height plus one.
//     chain.mineEmptyBlockUntil(targetBlockHeight + 1);

//     const block = chain.mineBlock([
//       Tx.contractCall("timelocked-wallet", "lock", [
//         types.principal(beneficiary.address),
//         types.uint(targetBlockHeight),
//         types.uint(amount),
//       ], deployer.address),
//     ]);

//     // The second lock fails with err-unlock-in-past (err u102).
//     block.receipts[0].result.expectErr().expectUint(102);

//     // Assert there are no transfer events.
//     assertEquals(block.receipts[0].events.length, 0);
//   },
// });
