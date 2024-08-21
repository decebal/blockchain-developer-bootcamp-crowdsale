// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const {startOfMonth, addMonths} = require("date-fns");

async function main() {
    const NAME = 'OWL Token'
    const SYMBOL = 'OWL'
    const MAX_SUPPLY = '1000000'
    const PRICE = ethers.utils.parseUnits('0.025', 'ether')
    const DEADLINE = Math.floor(startOfMonth(addMonths(new Date(), 1)).getTime() / 1000)
    const MIN_CONTRIBUTIONS = '10'
    const MAX_CONTRIBUTIONS = '10000'

    // Deploy Token
    const Token = await hre.ethers.getContractFactory("Token")
    const token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY)
    await token.deployed()

    console.log(`Token deployed to: ${token.address}\n`)

    // Deploy Crowdsale
    const Crowdsale = await hre.ethers.getContractFactory("OwlCrowdsale")
    const crowdsale = await Crowdsale.deploy(
        token.address,
        PRICE,
        ethers.utils.parseUnits(MAX_SUPPLY, 'ether'),
        DEADLINE,
        ethers.utils.parseUnits(MIN_CONTRIBUTIONS, 'ether'),
        ethers.utils.parseUnits(MAX_CONTRIBUTIONS, 'ether'),
    )
    await crowdsale.deployed();

    console.log(`Crowdsale deployed to: ${crowdsale.address}\n`)

    const transaction = await token.transfer(crowdsale.address, ethers.utils.parseUnits(MAX_SUPPLY, 'ether'))
    await transaction.wait()

    console.log(`Tokens transferred to Crowdsale\n`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
