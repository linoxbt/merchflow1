// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/MerchantRegistry.sol";

contract MerchantRegistryTest {
    MerchantRegistry private registry;

    constructor() {
        registry = new MerchantRegistry();
    }

    function testRegisterMerchant() public {
        bytes32 metadataHash = keccak256("metadata");
        bytes32 categoryHash = keccak256("Technology");

        registry.register(metadataHash, categoryHash);

        MerchantRegistry.Merchant memory row = registry.getMerchant(address(this));
        require(row.wallet == address(this), "wallet mismatch");
        require(row.metadataHash == metadataHash, "metadata mismatch");
        require(row.categoryHash == categoryHash, "category mismatch");
        require(row.active, "merchant inactive");
        require(row.onboardedAt > 0, "missing timestamp");
        require(registry.isRegistered(address(this)), "not registered");
    }

    function testRegisterUpdatesExistingMerchantWithoutChangingTimestamp() public {
        registry.register(keccak256("one"), keccak256("Technology"));
        uint64 onboardedAt = registry.getMerchant(address(this)).onboardedAt;

        registry.register(keccak256("two"), keccak256("Retail"));

        MerchantRegistry.Merchant memory row = registry.getMerchant(address(this));
        require(row.onboardedAt == onboardedAt, "timestamp changed");
        require(row.metadataHash == keccak256("two"), "metadata not updated");
        require(row.categoryHash == keccak256("Retail"), "category not updated");
    }

    function testSetInactive() public {
        registry.register(keccak256("metadata"), keccak256("Technology"));
        registry.setActive(false);
        require(!registry.isRegistered(address(this)), "still registered");
        require(!registry.getMerchant(address(this)).active, "still active");
    }
}
