// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Campaign.sol";

/// @title A factory contract for creating and managing crowdfunding campaigns
/// @author anstormx
/// @notice This contract allows users to create new crowdfunding campaigns and admins to manage them
/// @dev This contract deploys new Campaign contracts and keeps track of them
contract CampaignFactory is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _campaignIdCounter;
    mapping(uint => address) public campaigns;
    mapping(address => bool) public activeCampaigns;

    event CampaignCreated(
        uint indexed campaignId,
        address campaignAddress,
        address creator
    );
    event CampaignRemoved(uint indexed campaignId, address campaignAddress);

    constructor() {
        _transferOwnership(msg.sender);
    }

    /// @notice Creates a new crowdfunding campaign
    /// @dev Deploys a new Campaign contract and stores its address
    /// @param minContribution The minimum contribution amount for the campaign
    /// @return The address of the newly created campaign
    function createCampaign(uint minContribution) public returns (address) {
        uint256 newCampaignId = _campaignIdCounter.current();
        address newCampaign = address(
            new Campaign(minContribution, address(this))
        );
        campaigns[newCampaignId] = newCampaign;
        activeCampaigns[newCampaign] = true;
        _campaignIdCounter.increment();

        emit CampaignCreated(newCampaignId, newCampaign, msg.sender);
        return newCampaign;
    }

    /// @notice Retrieves all deployed campaign addresses
    /// @return An array of addresses of all deployed campaigns
    function getDeployedCampaigns() public view returns (address[] memory) {
        address[] memory deployedCampaigns = new address[](
            _campaignIdCounter.current()
        );
        for (uint i = 0; i < _campaignIdCounter.current(); i++) {
            deployedCampaigns[i] = campaigns[i];
        }
        return deployedCampaigns;
    }

    /// @notice Allows the admin to remove an inactive campaign
    /// @dev Only callable by the admin
    /// @param campaignId The ID of the campaign to remove
    function removeInactiveCampaign(uint campaignId) public onlyOwner {
        require(
            campaignId < _campaignIdCounter.current(),
            "Invalid campaign ID"
        );
        address campaignAddress = campaigns[campaignId];
        require(campaignAddress != address(0), "Campaign does not exist");

        Campaign campaign = Campaign(payable(campaignAddress));
        require(
            campaign.getRequestsCount() == 0,
            "Campaign has active requests"
        );
        require(
            campaign.getContributorsCount() == 0,
            "Campaign has contributors"
        );
        require(campaign.getTotalFunds() == 0, "Campaign has remaining funds");

        if (!campaign.isCancelled()) {
            campaign.forceCancel();
        }

        delete campaigns[campaignId];
        activeCampaigns[campaignAddress] = false;

        emit CampaignRemoved(campaignId, campaignAddress);
    }

    function getCampaignStatus(
        address campaignAddress
    ) public view returns (bool) {
        return
            activeCampaigns[campaignAddress] &&
            !Campaign(payable(campaignAddress)).isCancelled();
    }
}
