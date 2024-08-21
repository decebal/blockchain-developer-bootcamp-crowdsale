import {intervalToDuration} from "date-fns"
import React, {useEffect, useState} from 'react'
import {TimeUnit} from './Countdown/time-unit'

const Countdown = ({deadline, isOpen, className}) => {
    const [duration, setDuration] = useState({});

    useEffect(() => {
        let interval = null;
        if (deadline) {
            interval = setInterval(() => {
                setDuration(intervalToDuration({
                    start: new Date(),
                    end: deadline
                }))
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [deadline]);

    if (!deadline) return <></>

    return (
        <div className={className}>
            {isOpen &&
                (<>
                    <p className='text-center'>
                        <strong className="mx-4">Crowdsale active for:</strong>
                    </p>
                    <div className="d-flex align-items-center justify-content-center">
                        {Object.keys(duration).map((key, index) => (
                            <>
                                <TimeUnit duration={key} value={duration[key]}/>
                                {index !== Object.keys(duration).length - 1 &&
                                    <div className="fs-3 fw-semibold mx-4 mt-4">:</div>
                                }
                            </>
                        ))}
                    </div>
                </>)}
            {!isOpen && (<p className='text-center'>
                <strong className="mx-4">Crowdsale is closed!</strong>
            </p>)}
        </div>
    )
};

export {Countdown};
