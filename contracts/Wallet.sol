pragma solidity ^0.6.0;
//ability to return array of struct in getTransfers
pragma experimental ABIEncoderV2;

contract Wallet {
    //define approved addresses as an array that is accessible outside smart contract
    address[] public approvers;
    
    //hold transfers struct in array
    Transfer[] public transfers;

    //define number of approvers we need to approve a transfer
    uint public quorum; 
    
    // define transfer info struct
    struct Transfer {
        uint id;
        uint amount;
        address payable to;
        uint approvals;
        bool sent;
    }
    
    //mapping to record who has approved what (nested) address maps to uint id then bool
    mapping(address => mapping(uint => bool)) public approvals;
    
    //set values for approvers and quorum varibles
    constructor(address[] memory _approvers, uint _quorum) public {
        approvers = _approvers;
        quorum = _quorum; 
    }
    
    // read only to return approvers array list
    function getApprovers() external view returns(address[] memory) {
        return approvers;
    }
    
    // get a list of all the transfers we have created, also return only
    function getTransfers() external view returns(Transfer[] memory) {
        return transfers;
    }
    
    //transfer function called by approver address when to suggest new transfer of ether and instaniate transfer struct
    function createTransfer(uint amount, address payable to) external onlyApprover() {
        transfers.push(Transfer(
            transfers.length,
            amount,
            to,
            0,
            false
        ));
    }
    
    function approveTransfer(uint id) external onlyApprover() {
        //check transfer hasn't already been sent
        require(transfers[id].sent == false, 'transfer has already been sent');
        //check that the sender of transaction hasn't already approved the transfer
        require(approvals[msg.sender][id] == false, 'cannot approve transfer twice');
        
        //set approval to true so it cannot approve transfer again 
        approvals[msg.sender][id] = true;
        
        //increment the number of approval ids
        transfers[id].approvals++;
        
        //if we have enough approvals, we can send the transfer
        if(transfers[id].approvals >= quorum) {
            //update sent status to true
            transfers[id].sent = true;
            //extract details of transfer
            address payable to = transfers[id].to;
            uint amount = transfers[id].amount;
            //transfer here is a built in method to address type payable, nothing to with transfer struct
            to.transfer(amount);
        }
    }
    
    //send ether to address
    receive() external payable {}  
    
    //custom modifier for access control
    modifier onlyApprover() {
        bool allowed = false;
        
        //make sure calling address is in the approvers array
        for(uint i = 0; i < approvers.length; i++) {
            if(approvers[i] == msg.sender) {
                allowed = true;
            }
        }
        require(allowed == true, 'only approver allowed');
        
        //placeholder, executes original function which is being modified
        _;
    }
}
