//import openzepplen test helper
const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

//import contrat artifact, object created by truffle to allow us to interact with Smart Contract
const Wallet = artifacts.require('Wallet');

contract('Wallet', (accounts) => {
    let wallet;
    beforeEach(async () => {
        wallet = await Wallet.new([accounts[0], accounts[1], accounts[2]], 2);
        web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 1000});
    });

    //test after deploy that both addresses and quorum have correct value value
    it('should have correct approvers and quorum', async () => {
        const approvers = await wallet.getApprovers();
        const quorum = await wallet.quorum();

        //run assertions to ensure data does not fail test
        assert(approvers.length === 3);
        assert(approvers[0] === accounts[0]);
        assert(approvers[1] === accounts[1]);
        assert(approvers[2] === accounts[2]);
        assert(quorum.toNumber() === 2);
    })

    //test 1st transfer function struct values are valid (happy path)
    it('should create transfers', async () => {
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
        const transfers = await wallet.getTransfers();
        assert(transfers.length == 1);
        assert(transfers[0].id === '0');
        assert(transfers[0].amount === '100');
        assert(transfers[0].to == accounts[5]);
        assert(transfers[0].approvals === '0');
        assert(transfers[0].sent === false);
    });

    //test unhappy transfer path of transfer function
    it('should NOT create transfers if sender is not approved', async () => {
        await expectRevert(
            wallet.createTransfer(100, accounts[5], {from: accounts[4]}),
            'only approver allowed'
        );
    });

    //test happy path for approveTransfer for increment
    it('should increment approvals', async () => {
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        const transfers = await wallet.getTransfers();
        const balance = await web3.eth.getBalance(wallet.address);
        assert(transfers[0].approvals === '1');
        assert(transfers[0].sent === false);
        assert(balance === '1000');
    });

    //test 2nd happy path for approveTransfer was sent
    it('should send transfer if quorum reached', async () => {
        //use toBN since eth balances are super high in wei)
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        assert(balanceAfter.sub(balanceBefore).toNumber() === 100);
    });


    //test unhappy path for approveTransfer for address not approved
    it('should NOT appprove transfer if sender is not approved', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await expectRevert(
            wallet.approveTransfer(0, {from: accounts[4]}),
            'only approver allowed'
        );
    });

    //test unhappy path for approveTransfer for address already sent
    it('should NOT approve transfer if transfer is already sent', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        await expectRevert(
            wallet.approveTransfer(0, {from: accounts[2]}), 
            'transfer has already been sent'
        );
    });

    //test unhappy path for approveTransfer twice
    it('should NOT approve transfer twice', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await expectRevert(
            wallet.approveTransfer(0, {from: accounts[0]}),
            'cannot approve transfer twice'
        );
    });
});