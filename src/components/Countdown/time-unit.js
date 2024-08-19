import React from 'react'

const DAYS = 'days';
const HOURS = 'hours';
const MINUTES = 'minutes';
const SECONDS = 'seconds';

export const TIME_UNIT_NAMES = {
    [DAYS]: 'Days',
    [HOURS]: 'Hours',
    [MINUTES]: 'Minutes',
    [SECONDS]: 'Seconds'
};

const TimeUnit = ({ duration, value }) => {
    return (
        <div className="d-flex flex-column">
            <div className="fs-5 fw-bold">{TIME_UNIT_NAMES[duration]}</div>
            <div className="fs-3 fw-bolder text-center">{value}</div>
        </div>
    );
};

export { TimeUnit };
