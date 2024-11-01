// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

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
        mapping(address => bool) vote;
    }

    address payable public immutable factory;
    uint public immutable minimumContribution;
    mapping(address => uint) public contributions;
    Counters.Counter private _contributorsCount;
    mapping(uint => Request) public requests;
    Counters.Counter private _requestsCount;
    uint public totalFunds;
    uint public maxFunds;
    bool public isCancelled;

    event ContributionMade(address contributor, uint amount);
    event RequestCreated(
        uint requestId,
        string description,
        uint value,
        address recipient
    );
    event RequestApproved(uint requestId, address approver);
    event RequestRejected(uint requestId, address rejector);
    event RequestFinalized(uint requestId);
    event RequestCancelled(uint requestId);
    event RefundIssued(address contributor, uint amount);
    event CampaignCancelled();

    modifier campaignActive() {
        require(!isCancelled, "Campaign has been cancelled");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only the factory can call this function");
        _;
    }

    constructor(uint minContribution, address _factory) {
        _transferOwnership(msg.sender);
        factory = payable(_factory);
        minimumContribution = minContribution;
    }

    function _updateTotalFunds() internal {
        totalFunds = address(this).balance;
        if (totalFunds > maxFunds) {
            maxFunds = totalFunds;
        }
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
        _updateTotalFunds();
        emit ContributionMade(msg.sender, msg.value);
    }

    function createRequest(
        string memory description,
        uint value,
        address payable recipient
    ) public onlyOwner campaignActive nonReentrant {
        require(value > 0, "Request value must be greater than 0");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(recipient != address(0), "Invalid recipient address");
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
        newRequest.votingDeadline = block.timestamp + 7 days;

        _requestsCount.increment();
        emit RequestCreated(newRequestId, description, value, recipient);
    }

    function approveRequest(uint index) public campaignActive nonReentrant {
        require(index < _requestsCount.current(), "Invalid request index");
        require(contributions[msg.sender] > 0, "Only contributors can approve");
        Request storage request = requests[index];
        require(!request.vote[msg.sender], "You have already voted");
        require(
            block.timestamp <= request.votingDeadline,
            "Voting period has ended"
        );
        request.vote[msg.sender] = true;
        request.approvalCount++;
        emit RequestApproved(index, msg.sender);
    }

    function rejectRequest(uint index) public campaignActive nonReentrant {
        require(index < _requestsCount.current(), "Invalid request index");
        require(contributions[msg.sender] > 0, "Only contributors can reject");
        Request storage request = requests[index];
        require(!request.vote[msg.sender], "You have already voted");
        require(
            block.timestamp <= request.votingDeadline,
            "Voting period has ended"
        );

        request.vote[msg.sender] = true;
        request.rejectionCount++;
        emit RequestRejected(index, msg.sender);
    }

    function finalizeRequest(uint index) public onlyOwner nonReentrant {
        require(index < _requestsCount.current(), "Invalid request index");
        Request storage request = requests[index];
        require(
            block.timestamp > request.votingDeadline,
            "Voting period not ended"
        );
        require(!request.complete, "Request has already been completed");

        uint totalVotes = request.approvalCount + request.rejectionCount;
        uint quorum = (_contributorsCount.current() * 30) / 100; // 30% quorum

        require(totalVotes >= quorum, "Quorum not reached");
        require(
            request.approvalCount > request.rejectionCount,
            "Not enough approvals"
        );

        require(request.value <= address(this).balance, "Insufficient funds");

        request.complete = true;
        request.recipient.transfer(request.value);
        _updateTotalFunds();
        emit RequestFinalized(index);
    }

    function cancelRequest(uint index) public onlyOwner nonReentrant {
        require(index < _requestsCount.current(), "Invalid request index");
        Request storage request = requests[index];
        require(!request.complete, "Request has already been completed");
        require(
            block.timestamp <= request.votingDeadline,
            "Voting period ended"
        );
        request.complete = true;
        emit RequestCancelled(index);
    }

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

    function getRequestsCount() public view returns (uint) {
        return _requestsCount.current();
    }

    function cancelCampaign() public campaignActive onlyOwner nonReentrant {
        factory.transfer(address(this).balance);
        isCancelled = true;
        _updateTotalFunds();
        emit CampaignCancelled();
    }

    function forceCancel() public campaignActive onlyFactory nonReentrant {
        factory.transfer(address(this).balance);
        isCancelled = true;
        _updateTotalFunds();
        emit CampaignCancelled();
    }

    function getContributorsCount() public view returns (uint) {
        return _contributorsCount.current();
    }

    function getTotalFunds() public view returns (uint) {
        return totalFunds;
    }

    function getMaxFunds() public view returns (uint) {
        return maxFunds;
    }

    receive() external payable {
        contribute();
    }
}
