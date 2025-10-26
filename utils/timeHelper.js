import moment from 'moment-timezone'

const timeHelper = {
    now: () => moment.tz('Asia/Manila').toDate(),
    today: () => moment.tz('Asia/Manila').startOf('day').toDate(),
    tomorrow: () => moment.tz('Asia/Manila').startOf('day').add(1, 'day').toDate(),
}

export default timeHelper;