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
      `${simnet.deployer}.timelocked-wallet`
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
    expect(lockTx.result).toBeOk(Cl.bool(true));

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
    expect(claimTx.result).toBeErr(Cl.uint(105));

    // expecting no transfer events
    expect(claimTx.events).toHaveLength(0);
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
    expect(lockTx.result).toBeErr(Cl.uint(103));

    // expecting no transfer events
    expect(lockTx.events).toHaveLength(0);
  });
});

describe("Test Bestow Functionality", () => {
  it("allows the beneficiary to bestow the right to claim to someone else", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const new_beneficiary = accounts.get("wallet_2")!;
    const amount = 10;

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(30), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true));

    const beneficiary_original = simnet.getDataVar(
      "timelocked-wallet",
      "beneficiary"
    );
    expect(beneficiary_original).toBeSome(Cl.principal(beneficiary));

    const bestowTx = simnet.callPublicFn(
      "timelocked-wallet",
      "bestow",
      [Cl.principal(new_beneficiary)],
      beneficiary
    );
    expect(bestowTx.result).toBeOk(Cl.bool(true));

    const beneficiary_updated = simnet.getDataVar(
      "timelocked-wallet",
      "beneficiary"
    );
    expect(beneficiary_updated).toBeSome(Cl.principal(new_beneficiary));
  });

  it("does not allow anyone else to bestow the right to claim to someone else", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const new_beneficiary = accounts.get("wallet_2")!;
    const another_user = accounts.get("wallet_3")!;
    const amount = 10;

    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(30), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true));

    const beneficiary_original = simnet.getDataVar(
      "timelocked-wallet",
      "beneficiary"
    );
    expect(beneficiary_original).toBeSome(Cl.principal(beneficiary));

    const bestowTx_deployer = simnet.callPublicFn(
      "timelocked-wallet",
      "bestow",
      [Cl.principal(new_beneficiary)],
      deployer
    );
    // expecting err-not-beneficiary (err u104)
    expect(bestowTx_deployer.result).toBeErr(Cl.uint(104));

    const bestowTx_another_user = simnet.callPublicFn(
      "timelocked-wallet",
      "bestow",
      [Cl.principal(new_beneficiary)],
      another_user
    );
    // expecting err-not-beneficiary (err u104)
    expect(bestowTx_another_user.result).toBeErr(Cl.uint(104));

    const beneficiary_updated = simnet.getDataVar(
      "timelocked-wallet",
      "beneficiary"
    );

    // expecting the beneficiary to be unchanged
    expect(beneficiary_updated).toBeSome(Cl.principal(beneficiary));
  });
});

describe("Test Claim Functionality", () => {
  it("allows the beneficiary to claim the balance when the block-height is reached", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const amount = 10;
    const assets_before_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true));
    expect(lockTx.events).toHaveLength(1);

    simnet.mineEmptyBlocks(10);

    const claimTx = simnet.callPublicFn(
      "timelocked-wallet",
      "claim",
      [],
      beneficiary
    );

    const assets_after_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    expect(claimTx.result).toBeOk(Cl.bool(true));
    expect(claimTx.events).toHaveLength(1);
    expect(assets_after_claim).toBeGreaterThan(assets_before_claim);
  });

  it("does not allow the beneficiary to claim the balance before the block-height is reached", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const amount = 10;
    const assets_before_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true));
    expect(lockTx.events).toHaveLength(1);

    // not enough blocks mined
    simnet.mineEmptyBlocks(5);

    const claimTx = simnet.callPublicFn(
      "timelocked-wallet",
      "claim",
      [],
      beneficiary
    );
    const assets_after_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    // expect err-too-soon (err u105)
    expect(claimTx.result).toBeErr(Cl.uint(105));
    expect(claimTx.events).toHaveLength(0);
    expect(assets_after_claim).toEqual(assets_before_claim);
  });

  it("does not allow anyone else to claim the balance when the block-height is reached", () => {
    const deployer = accounts.get("deployer")!;
    const beneficiary = accounts.get("wallet_1")!;
    const someone_else = accounts.get("wallet_2")!;
    const amount = 10;
    const assets_before_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    const lockTx = simnet.callPublicFn(
      "timelocked-wallet",
      "lock",
      [Cl.principal(beneficiary), Cl.uint(10), Cl.uint(amount)],
      deployer
    );
    expect(lockTx.result).toBeOk(Cl.bool(true));
    expect(lockTx.events).toHaveLength(1);

    simnet.mineEmptyBlocks(15);

    const claimTx = simnet.callPublicFn(
      "timelocked-wallet",
      "claim",
      [],
      someone_else
    );
    const assets_after_claim = simnet
      .getAssetsMap()
      .get("STX")!
      .get(beneficiary)!;
    // err-not-beneficiary (err u104)
    expect(claimTx.result).toBeErr(Cl.uint(104));
    expect(claimTx.events).toHaveLength(0);
    expect(assets_after_claim).toEqual(assets_before_claim);
  });
});
