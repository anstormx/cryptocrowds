// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Campaign.sol";

contract CampaignFactory is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct CampaignInfo {
        address campaignAddress;
        bool isActive;
        uint256 createdAt;
        uint256 minContribution;
        address creator;
    }

    Counters.Counter private _campaignIdCounter;
    mapping(uint => CampaignInfo) public campaigns;
    mapping(address => uint) public campaignIds;

    event CampaignCreated(
        uint indexed campaignId,
        address indexed campaignAddress,
        address indexed creator,
        uint256 minContribution,
        uint256 timestamp
    );
    event CampaignRemoved(
        uint indexed campaignId,
        address indexed campaignAddress
    );
    event CampaignStatusChanged(
        uint indexed campaignId,
        address indexed campaignAddress,
        bool isActive
    );

    constructor() {
        _transferOwnership(msg.sender);
    }

    function createCampaign(
        uint minContribution
    ) public nonReentrant returns (address) {
        require(
            minContribution > 0,
            "Minimum contribution must be greater than 0"
        );

        uint256 newCampaignId = _campaignIdCounter.current();
        address newCampaign = address(
            new Campaign(minContribution, address(this))
        );

        require(newCampaign != address(0), "Campaign creation failed");

        campaigns[newCampaignId] = CampaignInfo({
            campaignAddress: newCampaign,
            isActive: true,
            createdAt: block.timestamp,
            minContribution: minContribution,
            creator: msg.sender
        });

        campaignIds[newCampaign] = newCampaignId;
        _campaignIdCounter.increment();

        emit CampaignCreated(
            newCampaignId,
            newCampaign,
            msg.sender,
            minContribution,
            block.timestamp
        );
        emit CampaignStatusChanged(newCampaignId, newCampaign, true);
        return newCampaign;
    }

    function getDeployedCampaigns()
        public
        view
        returns (address[] memory, bool[] memory)
    {
        uint256 count = _campaignIdCounter.current();

        address[] memory addresses = new address[](count);
        bool[] memory statuses = new bool[](count);

        for (uint i = 0; i < count; i++) {
            CampaignInfo memory campaign = campaigns[i];
            addresses[i] = campaign.campaignAddress;
            statuses[i] =
                campaign.isActive &&
                !Campaign(payable(campaign.campaignAddress)).isCancelled();
        }

        return (addresses, statuses);
    }

    function getActiveCampaigns() public view returns (address[] memory) {
        uint256 count = _campaignIdCounter.current();
        uint256 activeCount = 0;

        for (uint i = 0; i < count; i++) {
            if (
                campaigns[i].isActive &&
                !Campaign(payable(campaigns[i].campaignAddress)).isCancelled()
            ) {
                activeCount++;
            }
        }

        address[] memory activeCampaigns = new address[](activeCount);
        uint256 currentIndex = 0;

        for (uint i = 0; i < count && currentIndex < activeCount; i++) {
            if (
                campaigns[i].isActive &&
                !Campaign(payable(campaigns[i].campaignAddress)).isCancelled()
            ) {
                activeCampaigns[currentIndex] = campaigns[i].campaignAddress;
                currentIndex++;
            }
        }

        return activeCampaigns;
    }

    function deactivateCampaign(uint campaignId) public onlyOwner nonReentrant {
        require(
            campaignId < _campaignIdCounter.current(),
            "Invalid campaign ID"
        );
        require(campaigns[campaignId].isActive, "Campaign already inactive");

        CampaignInfo storage campaignInfo = campaigns[campaignId];
        Campaign campaign = Campaign(payable(campaignInfo.campaignAddress));

        if (!campaign.isCancelled()) {
            campaign.forceCancel();
        }

        campaignInfo.isActive = false;

        emit CampaignRemoved(campaignId, campaignInfo.campaignAddress);
        emit CampaignStatusChanged(
            campaignId,
            campaignInfo.campaignAddress,
            false
        );
    }

    function getCampaignStatus(
        address campaignAddress
    ) public view returns (bool) {
        uint campaignId = campaignIds[campaignAddress];
        if (
            campaignId >= _campaignIdCounter.current() ||
            campaigns[campaignId].campaignAddress != campaignAddress
        ) {
            return false;
        }
        return
            campaigns[campaignId].isActive &&
            !Campaign(payable(campaignAddress)).isCancelled();
    }

    function getCampaignInfo(
        uint campaignId
    )
        public
        view
        returns (
            address campaignAddress,
            bool isActive,
            uint256 createdAt,
            uint256 minContribution,
            address creator
        )
    {
        require(
            campaignId < _campaignIdCounter.current(),
            "Invalid campaign ID"
        );

        CampaignInfo memory info = campaigns[campaignId];
        return (
            info.campaignAddress,
            info.isActive,
            info.createdAt,
            info.minContribution,
            info.creator
        );
    }
}
