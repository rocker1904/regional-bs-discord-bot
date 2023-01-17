export default class TimeStuff {
    public static calculateTime(ms: number): string {
        const timeArray = [];
        // Milliseconds to seconds
        let delta = Math.abs(ms / 1000);

        // Whole months
        const months = {amount: Math.floor(delta / 2592000), scale: 'month'};
        timeArray.push(months);
        delta -= months.amount * 2592000;

        // Whole weeks
        const weeks = {amount: Math.floor(delta / 604800), scale: 'week'};
        timeArray.push(weeks);
        delta -= weeks.amount * 604800;

        // Whole days
        const days = {amount: Math.floor(delta / 86400), scale: 'day'};
        timeArray.push(days);
        delta -= days.amount * 86400;

        // Whole hours
        const hours = {amount: Math.floor(delta / 3600), scale: 'hour'};
        timeArray.push(hours);
        delta -= hours.amount * 3600;

        // Whole minutes
        const minutes = {amount: Math.floor(delta / 60), scale: 'minute'};
        timeArray.push(minutes);
        delta -= minutes.amount * 60;

        // Seconds
        const seconds = {amount: Math.round(delta), scale: 'second'};
        timeArray.push(seconds);

        return this.twoHighestTimeScales(timeArray);
    }

    private static twoHighestTimeScales(timeArray: {amount: number, scale: string}[]): string {
        let string = '';
        let valuesFound = 0;
        for (let i = 0; i < timeArray.length; i++) {
            if (timeArray[i].amount !== 0) {
                if (valuesFound === 1) string = string + ' ';
                if (timeArray[i].amount > 1) timeArray[i].scale = timeArray[i].scale + 's';
                string = string + timeArray[i].amount.toString() + ' ' + timeArray[i].scale;
                valuesFound++;
            }
            if (valuesFound === 2) break;
        }
        return string;
    }
}
