const {expect} = require('chai');
const {ethers} = require('hardhat');
const {startOfMonth, addMonths, subMonths} = require("date-fns");

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('TimedCrowdsale', () => {
    describe('Crowdsale Open', () => {
        let token, crowdsale, deployer, user1

        beforeEach(async () => {
            const Crowdsale = await ethers.getContractFactory('TimedCrowdsale')
            const Token = await ethers.getContractFactory('Token')

            token = await Token.deploy('OWL Token', 'OWL', '1000000')

            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            user1 = accounts[1]

            const deadline = Math.floor(startOfMonth(addMonths(new Date(), 1)).getTime() / 1000)
            crowdsale = await Crowdsale.deploy(
                token.address,
                ether(1),
                '1000000',
                deadline,
                '10',
                '1000',
            )

            const transaction = await token.connect(deployer).transfer(crowdsale.address, tokens(1000000))
            await transaction.wait()
        })

        describe('Deployment', () => {

            it('sends tokens to the Crowdsale contract', async () => {
                expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(1000000))
            })

            it('returns the price', async () => {
                expect(await crowdsale.price()).to.equal(ether(1))
            })

            it('returns token address', async () => {
                expect(await crowdsale.token()).to.equal(token.address)
            })

        })

        describe('Buying Tokens', () => {
            let transaction, result
            let amount = tokens(10)

            describe('Success', () => {

                beforeEach(async () => {
                    await crowdsale.connect(deployer).whitelistAddress(user1.address)
                    transaction = await crowdsale.connect(user1).buyTokens(amount, {value: ether(10)})
                    result = await transaction.wait()
                })

                it('transfers tokens', async () => {
                    expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(999990))
                    expect(await token.balanceOf(user1.address)).to.equal(amount)
                })

                it('updates tokensSold', async () => {
                    expect(await crowdsale.tokensSold()).to.equal(amount)
                })

                it('emits a buy event', async () => {
                    // --> https://hardhat.org/hardhat-chai-matchers/docs/reference#.emit
                    await expect(transaction).to.emit(crowdsale, "Buy")
                        .withArgs(amount, user1.address)
                })

            })

            describe('Failure', () => {

                beforeEach(async () => {
                    await crowdsale.connect(deployer).whitelistAddress(user1.address)
                })

                it('rejects insufficient ETH', async () => {
                    (await expect(crowdsale.connect(user1).buyTokens(tokens(10), {value: 0})).to.be.revertedWith('Insufficient ETH'))
                })
            })

            describe('Failure whitelist', () => {
                it('rejects non-whitelist addresses', async () => {
                    (await expect(crowdsale.connect(user1).buyTokens(tokens(10), {value: 0})).to.be.revertedWith('Caller is not on the whitelist'))
                })
            })

        })

        describe('Minimum/Maximum Contributions', () => {

            beforeEach(async () => {
                await crowdsale.connect(deployer).whitelistAddress(user1.address)
            })

            describe('Success', () => {
                let transaction, result
                let amount = tokens(10)
                it('transfers tokens', async () => {
                    transaction = await crowdsale.connect(user1).buyTokens(amount, {value: ether(10)})
                    result = await transaction.wait()
                    expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(999990))
                    expect(await token.balanceOf(user1.address)).to.equal(amount)
                })
            })

            describe('Failure', () => {

                it('prevents below minimum contribution', async () => {
                    (await expect(crowdsale.connect(user1).buyTokens(tokens(9), {value: ether(9)})).to.be.revertedWith('Tokens amount is below minimum required'))
                })
                it('prevents above maximum contribution', async () => {
                    (await expect(crowdsale.connect(user1).buyTokens(tokens(1001), {value: ether(1001)})).to.be.revertedWith('Tokens amount is above maximum allowed'))
                })

            })
        })

        describe('Sending ETH', () => {
            let transaction, result
            let amount = ether(10)

            describe('Success', () => {

                beforeEach(async () => {
                    await crowdsale.connect(deployer).whitelistAddress(user1.address)
                    transaction = await user1.sendTransaction({to: crowdsale.address, value: amount})
                    result = await transaction.wait()
                })

                it('updates contracts ether balance', async () => {
                    expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(amount)
                })

                it('updates user token balance', async () => {
                    expect(await token.balanceOf(user1.address)).to.equal(amount)
                })

            })

            describe('Failure', () => {
                it('prevents non-whitelist from buying tokens via receive', async () => {
                    expect(user1.sendTransaction({
                        to: crowdsale.address,
                        value: amount,
                        gasLimit: 51000
                    })).to.be.reverted
                })
            })
        })

        describe('Updating Price', () => {
            let transaction, result
            let price = ether(2)

            describe('Success', () => {

                beforeEach(async () => {
                    transaction = await crowdsale.connect(deployer).setPrice(ether(2))
                    result = await transaction.wait()
                })

                it('updates the price', async () => {
                    expect(await crowdsale.price()).to.equal(ether(2))
                })

            })

            describe('Failure', () => {

                it('prevents non-owner from updating price', async () => {
                    await expect(crowdsale.connect(user1).setPrice(price)).to.be.reverted
                })

            })
        })

        describe('Finalizing Sale', () => {
            let transaction, result
            let amount = tokens(10)
            let value = ether(10)

            describe('Success', () => {

                beforeEach(async () => {
                    await crowdsale.connect(deployer).whitelistAddress(user1.address)
                    transaction = await crowdsale.connect(user1).buyTokens(amount, {value: value})
                    result = await transaction.wait()

                    transaction = await crowdsale.connect(deployer).finalize()
                    result = await transaction.wait()
                })

                it('transfers remaining tokens to owner', async () => {
                    expect(await token.balanceOf(crowdsale.address)).to.equal(0)
                    expect(await token.balanceOf(deployer.address)).to.equal(tokens(999990))
                })

                it('transfers ETH balance to owner', async () => {
                    expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(0)
                })

                it('emits Finalize event', async () => {
                    // --> https://hardhat.org/hardhat-chai-matchers/docs/reference#.emit
                    await expect(transaction).to.emit(crowdsale, "Finalize")
                        .withArgs(amount, value)
                })

            })

            describe('Failure', () => {

                it('prevents non-owner from finalizing', async () => {
                    await expect(crowdsale.connect(user1).finalize()).to.be.reverted
                })

            })
        })

        describe('Managing a whitelist', () => {
            describe('Success', () => {
                it('owner can add user to whitelist', async () => {
                    await crowdsale.connect(deployer).whitelistAddress(user1.address)
                    await expect(await crowdsale.whitelist(user1.address)).to.be.true
                })

            })

            describe('Failure', () => {

                it('prevents non-owner from adding to whitelist', async () => {
                    await expect(crowdsale.connect(user1).whitelistAddress(user1.address)).to.be.reverted
                })

            })
        })
    })

    describe('Crowdsale Deadline', () => {
        describe('Success', () => {
            let token, crowdsale, deployer, user1
            let result, transaction
            let amount = tokens(10)
            let value = ether(10)

            beforeEach(async () => {
                const Crowdsale = await ethers.getContractFactory('TimedCrowdsale')
                const Token = await ethers.getContractFactory('Token')

                token = await Token.deploy('OWL Token', 'OWL', '1000000')

                const accounts = await ethers.getSigners()
                deployer = accounts[0]
                user1 = accounts[1]

                const deadline = addMonths(new Date(), 1).getTime()
                crowdsale = await Crowdsale.deploy(
                    token.address,
                    ether(1),
                    '1000000',
                    deadline,
                    '10',
                    '10000',
                )

                const transaction = await token.connect(deployer).transfer(crowdsale.address, tokens(1000000))
                await transaction.wait()
                await crowdsale.connect(deployer).whitelistAddress(user1.address)
            })

            it('Can buy before the deadline', async () => {
                transaction = await crowdsale.connect(user1).buyTokens(amount, {value: value})
                result = await transaction.wait()
                expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(amount)
            })

        })

        describe('Failure', () => {

            let token, deployer, user1
            let result, transaction
            let crowdsaleAfterDeadline
            let amount = tokens(10)
            let value = ether(10)

            beforeEach(async () => {
                const Crowdsale = await ethers.getContractFactory('TimedCrowdsale')
                const Token = await ethers.getContractFactory('Token')

                token = await Token.deploy('OWL Token', 'OWL', '1000000')

                const accounts = await ethers.getSigners()
                deployer = accounts[0]
                user1 = accounts[1]

                const deadline = Math.floor(startOfMonth(subMonths(new Date(), 1)).getTime() / 1000)
                crowdsaleAfterDeadline = await Crowdsale.deploy(
                    token.address,
                    ether(1),
                    '1000000',
                    deadline,
                    '10',
                    '10000',
                )

                const transaction = await token.connect(deployer).transfer(crowdsaleAfterDeadline.address, tokens(1000000))
                await transaction.wait()
                await crowdsaleAfterDeadline.connect(deployer).whitelistAddress(user1.address)
            })

            it('prevents user from buying tokens after deadline', async () => {
                await expect(crowdsaleAfterDeadline.connect(user1).buyTokens(amount, {value}))
                    .to.be.revertedWith('The crowdsale is closed')
            })

            it('prevents user from buying tokens after deadline via receive', async () => {
                await expect(user1.sendTransaction({
                    to: crowdsaleAfterDeadline.address,
                    value: amount,
                    gasLimit: 51000
                })).to.be.reverted
            })

        })
    })
})
