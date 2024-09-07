// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title A crowdfunding campaign contract
/// @author anstormx
/// @notice This contract manages a single crowdfunding campaign
/// @dev This contract handles contributions, spending requests, and fund management
contract Campaign is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    struct Request {
        string description;
        uint value;
        address payable recipient;
        bool complete;
        uint approvalCount;
        uint rejectionCount;
        uint votingDeadline;
        mapping(address => bool) approvals;
    }

    address public immutable factory;
    uint public immutable minimumContribution;
    mapping(address => uint) public contributions;
    Counters.Counter private _contributorsCount;
    mapping(uint => Request) public requests;
    Counters.Counter private _requestsCount;
    uint public totalFunds;
    bool public isCancelled;

    event ContributionMade(address contributor, uint amount);
    event RequestCreated(
        uint requestId,
        string description,
        uint value,
        address recipient
    );
    event RequestApproved(uint requestId, address approver);
    event RequestFinalized(uint requestId);
    event RefundIssued(address contributor, uint amount);
    event CampaignCancelled();

    modifier campaignActive() {
        require(!isCancelled, "Campaign has been cancelled");
        _;
    }

    constructor(uint minContribution, address _factory) {
        _transferOwnership(msg.sender);
        factory = _factory;
        minimumContribution = minContribution;
    }

    function contribute() public payable campaignActive nonReentrant {
        require(
            msg.value >= minimumContribution,
            "Contribution below minimum amount"
        );
        if (contributions[msg.sender] == 0) {
            _contributorsCount.increment();
        }
        contributions[msg.sender] += msg.value;
        totalFunds += msg.value;
        emit ContributionMade(msg.sender, msg.value);
    }

    /// @notice Creates a new spending request
    /// @dev Only the manager can create requests
    /// @param description A description of the spending request
    /// @param value The amount of wei to be spent
    /// @param recipient The address to receive the funds
    function createRequest(
        string memory description,
        uint value,
        address payable recipient
    ) public onlyOwner {
        require(
            value <= address(this).balance,
            "Insufficient funds for request"
        );
        uint newRequestId = _requestsCount.current();
        Request storage newRequest = requests[newRequestId];
        newRequest.description = description;
        newRequest.value = value;
        newRequest.recipient = recipient;
        newRequest.complete = false;
        newRequest.votingDeadline = block.timestamp + 7 days; // Set a voting deadline
        _requestsCount.increment();
        emit RequestCreated(newRequestId, description, value, recipient);
    }

    /// @notice Allows a contributor to approve a spending request
    /// @param index The index of the request in the requests array
    function approveRequest(uint index) public {
        require(contributions[msg.sender] > 0, "Only contributors can approve");
        Request storage request = requests[index];
        require(!request.approvals[msg.sender], "You have already voted");
        require(
            block.timestamp <= request.votingDeadline,
            "Voting period has ended"
        );
        request.approvals[msg.sender] = true;
        request.approvalCount++;
        emit RequestApproved(index, msg.sender);
    }

    /// @notice Finalizes a request and sends the funds if approved
    /// @dev Only the manager can finalize requests
    /// @param index The index of the request in the requests array
    function finalizeRequest(uint index) public onlyOwner nonReentrant {
        Request storage request = requests[index];
        require(!request.complete, "Request has already been completed");
        require(
            request.approvalCount > (_contributorsCount.current() / 2),
            "Not enough approvals"
        );
        require(request.value <= address(this).balance, "Insufficient funds");
        request.complete = true;
        request.recipient.transfer(request.value);
        totalFunds -= request.value;
        emit RequestFinalized(index);
    }

    /// @notice Retrieves a summary of the campaign
    /// @return minimumContribution The minimum contribution amount
    /// @return balance The current balance of the campaign
    /// @return requestsCount The number of spending requests
    /// @return contributorsCount The number of contributors
    /// @return manager The address of the campaign manager
    function getSummary()
        public
        view
        returns (uint, uint, uint, uint, address)
    {
        return (
            minimumContribution,
            address(this).balance,
            _requestsCount.current(),
            _contributorsCount.current(),
            owner()
        );
    }

    /// @notice Retrieves the number of spending requests
    /// @return The total number of spending requests
    function getRequestsCount() public view returns (uint) {
        return _requestsCount.current();
    }

    /// @notice Allows contributors to get a refund if the voting fails
    /// @dev Implements a 5% fee for refunds, or allows keeping funds in the contract
    /// @param requestIndex The index of the failed request
    function getRefund(uint requestIndex) public campaignActive nonReentrant {
        Request storage request = requests[requestIndex];
        require(contributions[msg.sender] > 0, "Not a contributor");
        require(
            block.timestamp > request.votingDeadline,
            "Voting still in progress"
        );
        require(
            request.rejectionCount > request.approvalCount,
            "Request was not rejected"
        );

        uint refundAmount = contributions[msg.sender];
        uint fee = (refundAmount * 5) / 100; // 5% fee
        uint refundAmountAfterFee = refundAmount - fee;

        contributions[msg.sender] = 0;
        totalFunds -= refundAmount;
        payable(msg.sender).transfer(refundAmountAfterFee);

        emit RefundIssued(msg.sender, refundAmountAfterFee);
    }

    /// @notice Allows the manager to cancel the campaign and refund all contributors
    /// @dev Only callable by the manager and if there are no active requests
    function cancelCampaign() public onlyOwner {
        require(!isCancelled, "Campaign is already cancelled");
        require(
            _requestsCount.current() == 0 ||
                requests[_requestsCount.current() - 1].complete,
            "There are active requests"
        );

        isCancelled = true;
        emit CampaignCancelled();
    }

    function getContributorsCount() public view returns (uint) {
        return _contributorsCount.current();
    }

    function getTotalFunds() public view returns (uint) {
        return totalFunds;
    }

    function forceCancel() public {
        require(msg.sender == factory, "Only the factory can force cancel");
        isCancelled = true;
        emit CampaignCancelled();
    }

    receive() external payable {
        contribute();
    }
}
