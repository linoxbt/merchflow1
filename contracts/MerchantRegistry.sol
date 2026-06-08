// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MerchFlow Merchant Registry
/// @notice On-chain merchant profile proof for QIE merchants.
contract MerchantRegistry {
    struct Merchant {
        address wallet;
        bytes32 metadataHash;
        bytes32 categoryHash;
        uint64 onboardedAt;
        bool active;
    }

    mapping(address => Merchant) private merchants;

    event MerchantRegistered(
        address indexed wallet,
        bytes32 indexed metadataHash,
        bytes32 indexed categoryHash,
        uint64 onboardedAt
    );
    event MerchantStatusUpdated(address indexed wallet, bool active);
    event MerchantMetadataUpdated(
        address indexed wallet,
        bytes32 indexed metadataHash,
        bytes32 indexed categoryHash
    );

    error EmptyMetadataHash();
    error EmptyCategoryHash();
    error MerchantNotRegistered(address wallet);

    function register(bytes32 metadataHash, bytes32 categoryHash) external {
        _validateProfile(metadataHash, categoryHash);

        Merchant storage merchant = merchants[msg.sender];
        uint64 onboardedAt = merchant.onboardedAt;
        if (onboardedAt == 0) {
            onboardedAt = uint64(block.timestamp);
            merchant.wallet = msg.sender;
            merchant.onboardedAt = onboardedAt;
        }

        merchant.metadataHash = metadataHash;
        merchant.categoryHash = categoryHash;
        merchant.active = true;

        emit MerchantRegistered(msg.sender, metadataHash, categoryHash, onboardedAt);
    }

    function updateMetadata(bytes32 metadataHash, bytes32 categoryHash) external {
        _requireRegistered(msg.sender);
        _validateProfile(metadataHash, categoryHash);

        Merchant storage merchant = merchants[msg.sender];
        merchant.metadataHash = metadataHash;
        merchant.categoryHash = categoryHash;

        emit MerchantMetadataUpdated(msg.sender, metadataHash, categoryHash);
    }

    function setActive(bool active) external {
        _requireRegistered(msg.sender);
        merchants[msg.sender].active = active;
        emit MerchantStatusUpdated(msg.sender, active);
    }

    function getMerchant(address wallet) external view returns (Merchant memory) {
        return merchants[wallet];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return merchants[wallet].onboardedAt != 0 && merchants[wallet].active;
    }

    function _validateProfile(bytes32 metadataHash, bytes32 categoryHash) private pure {
        if (metadataHash == bytes32(0)) revert EmptyMetadataHash();
        if (categoryHash == bytes32(0)) revert EmptyCategoryHash();
    }

    function _requireRegistered(address wallet) private view {
        if (merchants[wallet].onboardedAt == 0) revert MerchantNotRegistered(wallet);
    }
}

