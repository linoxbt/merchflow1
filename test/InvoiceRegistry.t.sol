// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/InvoiceRegistry.sol";

contract InvoiceRegistryActor {
    InvoiceRegistry private registry;

    constructor(InvoiceRegistry registry_) payable {
        registry = registry_;
    }

    receive() external payable {}

    function create(
        bytes32 invoiceId,
        string calldata number,
        address payer,
        uint256 amountQieWei,
        uint256 amountUsdCents,
        uint64 dueDate,
        bytes32 metadataHash,
        string calldata memo
    ) external {
        registry.createInvoice(
            invoiceId,
            number,
            payer,
            amountQieWei,
            amountUsdCents,
            dueDate,
            metadataHash,
            memo
        );
    }

    function pay(bytes32 invoiceId, uint256 amount) external {
        registry.payInvoice{value: amount}(invoiceId);
    }

    function cancel(bytes32 invoiceId) external {
        registry.cancelInvoice(invoiceId);
    }
}

contract InvoiceRegistryTest {
    InvoiceRegistry private registry;
    InvoiceRegistryActor private payer;
    InvoiceRegistryActor private wrongPayer;

    bytes32 private constant INVOICE_ID = keccak256("INV-0001");
    uint256 private constant AMOUNT_QIE_WEI = 1 ether;
    uint256 private constant AMOUNT_USD_CENTS = 10000;
    bytes32 private constant METADATA_HASH = keccak256("metadata");

    constructor() payable {
        registry = new InvoiceRegistry();
        payer = new InvoiceRegistryActor{value: 10 ether}(registry);
        wrongPayer = new InvoiceRegistryActor{value: 10 ether}(registry);
    }

    receive() external payable {}

    function testCreateInvoice() public {
        _createInvoice(INVOICE_ID);

        InvoiceRegistry.Invoice memory row = registry.getInvoice(INVOICE_ID);
        require(row.id == INVOICE_ID, "id mismatch");
        require(keccak256(bytes(row.number)) == keccak256("INV-0001"), "number mismatch");
        require(row.merchant == address(this), "merchant mismatch");
        require(row.payer == address(payer), "payer mismatch");
        require(row.amountQieWei == AMOUNT_QIE_WEI, "qie mismatch");
        require(row.amountUsdCents == AMOUNT_USD_CENTS, "usd mismatch");
        require(row.status == InvoiceRegistry.Status.Pending, "status mismatch");
        require(row.metadataHash == METADATA_HASH, "metadata mismatch");

        bytes32[] memory ids = registry.getMerchantInvoices(address(this));
        require(ids.length == 1, "missing merchant invoice");
        require(ids[0] == INVOICE_ID, "merchant invoice id mismatch");
    }

    function testRejectDuplicateInvoiceId() public {
        _createInvoice(INVOICE_ID);

        try this.createFromTest(INVOICE_ID) {
            revert("duplicate accepted");
        } catch {}
    }

    function testPayInvoice() public {
        _createInvoice(INVOICE_ID);

        payer.pay(INVOICE_ID, AMOUNT_QIE_WEI);

        InvoiceRegistry.Invoice memory row = registry.getInvoice(INVOICE_ID);
        require(row.status == InvoiceRegistry.Status.Paid, "not paid");
        require(row.paidAt > 0, "missing paid timestamp");
    }

    function testRejectWrongAmount() public {
        _createInvoice(INVOICE_ID);

        try payer.pay(INVOICE_ID, AMOUNT_QIE_WEI - 1) {
            revert("wrong amount accepted");
        } catch {}

        InvoiceRegistry.Invoice memory row = registry.getInvoice(INVOICE_ID);
        require(row.status == InvoiceRegistry.Status.Pending, "status changed");
    }

    function testRejectWrongPayer() public {
        _createInvoice(INVOICE_ID);

        try wrongPayer.pay(INVOICE_ID, AMOUNT_QIE_WEI) {
            revert("wrong payer accepted");
        } catch {}
    }

    function testCancelByMerchantOnly() public {
        _createInvoice(INVOICE_ID);

        try payer.cancel(INVOICE_ID) {
            revert("non-merchant cancelled");
        } catch {}

        registry.cancelInvoice(INVOICE_ID);
        InvoiceRegistry.Invoice memory row = registry.getInvoice(INVOICE_ID);
        require(row.status == InvoiceRegistry.Status.Cancelled, "not cancelled");
    }

    function testRejectPayingCancelledInvoice() public {
        _createInvoice(INVOICE_ID);
        registry.cancelInvoice(INVOICE_ID);

        try payer.pay(INVOICE_ID, AMOUNT_QIE_WEI) {
            revert("cancelled paid");
        } catch {}
    }

    function createFromTest(bytes32 invoiceId) external {
        _createInvoice(invoiceId);
    }

    function _createInvoice(bytes32 invoiceId) private {
        registry.createInvoice(
            invoiceId,
            "INV-0001",
            address(payer),
            AMOUNT_QIE_WEI,
            AMOUNT_USD_CENTS,
            uint64(block.timestamp + 7 days),
            METADATA_HASH,
            "Test invoice"
        );
    }
}
