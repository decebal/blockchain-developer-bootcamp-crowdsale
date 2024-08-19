import {useEffect, useState} from 'react';
import {Container} from 'react-bootstrap';
import {ethers} from 'ethers'
import {fromUnixTime, intervalToDuration, subMonths} from 'date-fns'

// Components
import Navigation from './Navigation';
import Buy from './Buy';
import Progress from './Progress';
import Info from './Info';
import Loading from './Loading';

// Artifacts
import CROWDSALE_ABI from '../abis/TimedCrowdsale.json'
import TOKEN_ABI from '../abis/Token.json'

// Config
import config from '../config.json';
import {Countdown} from "./Countdown";

function App() {
    const [provider, setProvider] = useState(null)
    const [crowdsale, setCrowdsale] = useState(null)

    const [account, setAccount] = useState(null)
    const [accountBalance, setAccountBalance] = useState(0)

    const [price, setPrice] = useState(0)
    const [maxTokens, setMaxTokens] = useState(0)
    const [tokensSold, setTokensSold] = useState(0)
    const [deadline, setDeadline] = useState(new Date())
    const [minContribution, setMinContribution] = useState(0)
    const [maxContribution, setMaxContribution] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const [isLoading, setIsLoading] = useState(true)

    const loadBlockchainData = async () => {
        // Instantiate provider
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        setProvider(provider)

        // Fetch Chain ID
        const {chainId} = await provider.getNetwork()

        // Instantiate contracts
        const token = new ethers.Contract(config[chainId].token.address, TOKEN_ABI, provider)
        const crowdsale = new ethers.Contract(config[chainId].crowdsale.address, CROWDSALE_ABI, provider)
        setCrowdsale(crowdsale)

        // Fetch account
        const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
        const account = ethers.utils.getAddress(accounts[0])
        setAccount(account)

        // Fetch account balance
        const accountBalance = ethers.utils.formatUnits(await token.balanceOf(account), 18)
        setAccountBalance(accountBalance)

        // Fetch price
        const price = ethers.utils.formatUnits(await crowdsale.price(), 18)
        setPrice(price)

        // Fetch max tokens
        const maxTokens = ethers.utils.formatUnits(await crowdsale.maxTokens(), 18)
        setMaxTokens(maxTokens)

        // Fetch tokens sold
        const tokensSold = ethers.utils.formatUnits(await crowdsale.tokensSold(), 18)
        setTokensSold(tokensSold)

        // Fetch Deadline and format the date
        const deadline = ethers.utils.formatUnits(await crowdsale.deadline(), 0)
        const duration = intervalToDuration({
            start: new Date(),
            end: fromUnixTime(deadline)
        })
        const isOpen = duration.days >= 0
        setDeadline(fromUnixTime(deadline))
        setIsOpen(isOpen)

        // Fetch Minimum required tokens
        const minContribution = ethers.utils.formatUnits(await crowdsale.minContribution(), 18)
        setMinContribution(minContribution)

        // Fetch Max Token Contribution
        const maxContribution = ethers.utils.formatUnits(await crowdsale.maxContribution(), 18)
        setMaxContribution(maxContribution)

        setIsLoading(false)
    }

    useEffect(() => {
        if (isLoading) {
            loadBlockchainData()
        }
    }, [isLoading])

    return (
        <Container>
            <Navigation/>

            <h1 className='my-4 text-center'>Introducing OWL Token!</h1>

            {isLoading ? (
                <Loading/>
            ) : (
                <>
                    <Countdown className='my-4' deadline={deadline} isOpen={isOpen}/>
                    <p className='text-center'>
                        <strong className="mx-4">Current Price:</strong> {price} ETH
                        <strong className="mx-4">Minimum contribution:</strong> {minContribution} OWL
                        <strong className="mx-4">Maximum contribution:</strong> {maxContribution} OWL
                    </p>
                    {(isOpen && <Buy
                        provider={provider}
                        price={price}
                        crowdsale={crowdsale}
                        setIsLoading={setIsLoading}
                    />)}
                    <Progress
                        maxTokens={maxTokens}
                        tokensSold={tokensSold}
                    />
                </>
            )}

            <hr/>

            {account && (
                <Info account={account} accountBalance={accountBalance}/>
            )}
        </Container>
    );
}

export default App;
