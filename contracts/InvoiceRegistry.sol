// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MerchFlow Invoice Registry
/// @notice On-chain invoice records and native QIE settlement for MerchFlow.
contract InvoiceRegistry {
    enum Status {
        None,
        Pending,
        Paid,
        Cancelled,
        Overdue
    }

    struct Invoice {
        bytes32 id;
        string number;
        address merchant;
        address payer;
        uint256 amountQieWei;
        uint256 amountUsdCents;
        uint64 dueDate;
        uint64 createdAt;
        uint64 paidAt;
        Status status;
        bytes32 metadataHash;
        string memo;
    }

    mapping(bytes32 => Invoice) private invoices;
    mapping(address => bytes32[]) private merchantInvoices;

    uint256 private constant MAX_NUMBER_BYTES = 64;
    uint256 private constant MAX_MEMO_BYTES = 280;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        string number,
        address indexed merchant,
        address indexed payer,
        uint256 amountQieWei,
        uint256 amountUsdCents,
        uint64 dueDate,
        bytes32 metadataHash
    );
    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        uint256 amountQieWei,
        uint64 paidAt
    );
    event InvoiceCancelled(bytes32 indexed invoiceId, address indexed merchant);
    event InvoiceStatusUpdated(bytes32 indexed invoiceId, Status status);

    error EmptyInvoiceId();
    error EmptyInvoiceNumber();
    error EmptyMetadataHash();
    error InvoiceNumberTooLong();
    error InvoiceMemoTooLong();
    error InvalidPayer();
    error InvalidAmount();
    error InvalidDueDate();
    error InvoiceAlreadyExists(bytes32 invoiceId);
    error InvoiceNotFound(bytes32 invoiceId);
    error NotInvoiceMerchant(bytes32 invoiceId, address caller);
    error NotInvoicePayer(bytes32 invoiceId, address caller);
    error InvoiceNotPayable(bytes32 invoiceId, Status status);
    error IncorrectPaymentAmount(uint256 expected, uint256 received);
    error InvoiceNotOverdue(bytes32 invoiceId);
    error PayoutFailed(address merchant, uint256 amount);

    function createInvoice(
        bytes32 invoiceId,
        string calldata number,
        address payer,
        uint256 amountQieWei,
        uint256 amountUsdCents,
        uint64 dueDate,
        bytes32 metadataHash,
        string calldata memo
    ) external {
        if (invoiceId == bytes32(0)) revert EmptyInvoiceId();
        if (bytes(number).length == 0) revert EmptyInvoiceNumber();
        if (bytes(number).length > MAX_NUMBER_BYTES) revert InvoiceNumberTooLong();
        if (payer == address(0)) revert InvalidPayer();
        if (amountQieWei == 0 || amountUsdCents == 0) revert InvalidAmount();
        if (dueDate == 0) revert InvalidDueDate();
        if (metadataHash == bytes32(0)) revert EmptyMetadataHash();
        if (bytes(memo).length > MAX_MEMO_BYTES) revert InvoiceMemoTooLong();
        if (invoices[invoiceId].createdAt != 0) revert InvoiceAlreadyExists(invoiceId);

        uint64 createdAt = uint64(block.timestamp);
        invoices[invoiceId] = Invoice({
            id: invoiceId,
            number: number,
            merchant: msg.sender,
            payer: payer,
            amountQieWei: amountQieWei,
            amountUsdCents: amountUsdCents,
            dueDate: dueDate,
            createdAt: createdAt,
            paidAt: 0,
            status: Status.Pending,
            metadataHash: metadataHash,
            memo: memo
        });
        merchantInvoices[msg.sender].push(invoiceId);

        emit InvoiceCreated(
            invoiceId,
            number,
            msg.sender,
            payer,
            amountQieWei,
            amountUsdCents,
            dueDate,
            metadataHash
        );
    }

    function payInvoice(bytes32 invoiceId) external payable {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.createdAt == 0) revert InvoiceNotFound(invoiceId);
        if (msg.sender != invoice.payer) revert NotInvoicePayer(invoiceId, msg.sender);

        Status status = _currentStatus(invoice);
        if (status != Status.Pending && status != Status.Overdue) {
            revert InvoiceNotPayable(invoiceId, status);
        }
        if (msg.value != invoice.amountQieWei) {
            revert IncorrectPaymentAmount(invoice.amountQieWei, msg.value);
        }

        uint64 paidAt = uint64(block.timestamp);
        invoice.status = Status.Paid;
        invoice.paidAt = paidAt;

        (bool ok,) = invoice.merchant.call{value: msg.value}("");
        if (!ok) revert PayoutFailed(invoice.merchant, msg.value);

        emit InvoicePaid(invoiceId, invoice.merchant, msg.sender, msg.value, paidAt);
    }

    function cancelInvoice(bytes32 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.createdAt == 0) revert InvoiceNotFound(invoiceId);
        if (msg.sender != invoice.merchant) revert NotInvoiceMerchant(invoiceId, msg.sender);

        Status status = _currentStatus(invoice);
        if (status != Status.Pending && status != Status.Overdue) {
            revert InvoiceNotPayable(invoiceId, status);
        }

        invoice.status = Status.Cancelled;
        emit InvoiceCancelled(invoiceId, msg.sender);
    }

    function markOverdue(bytes32 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.createdAt == 0) revert InvoiceNotFound(invoiceId);
        if (invoice.status != Status.Pending || block.timestamp <= invoice.dueDate) {
            revert InvoiceNotOverdue(invoiceId);
        }

        invoice.status = Status.Overdue;
        emit InvoiceStatusUpdated(invoiceId, Status.Overdue);
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        Invoice memory invoice = invoices[invoiceId];
        if (invoice.status == Status.Pending && block.timestamp > invoice.dueDate) {
            invoice.status = Status.Overdue;
        }
        return invoice;
    }

    function getMerchantInvoices(address merchant) external view returns (bytes32[] memory) {
        return merchantInvoices[merchant];
    }

    function statusOf(bytes32 invoiceId) external view returns (Status) {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.createdAt == 0) return Status.None;
        return _currentStatus(invoice);
    }

    function _currentStatus(Invoice storage invoice) private view returns (Status) {
        if (invoice.status == Status.Pending && block.timestamp > invoice.dueDate) {
            return Status.Overdue;
        }
        return invoice.status;
    }
}
