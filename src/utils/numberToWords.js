/**
 * Utility to convert numbers to words in the Indian/Bangladeshi numbering system.
 * Supports Lakhs and Crores.
 */

const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertToWords = (num) => {
    if (num === 0) return 'Zero';
    
    function translate(n) {
        let res = '';
        if (n >= 10000000) {
            res += translate(Math.floor(n / 10000000)) + ' Crore ';
            n %= 10000000;
        }
        if (n >= 100000) {
            res += translate(Math.floor(n / 100000)) + ' Lakh ';
            n %= 100000;
        }
        if (n >= 1000) {
            res += translate(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
        }
        if (n >= 100) {
            res += translate(Math.floor(n / 100)) + ' Hundred ';
            n %= 100;
        }
        if (n > 0) {
            if (res !== '' && n < 100) res += ''; // Could add 'and' here if needed for British style
            if (n < 20) {
                res += units[n];
            } else {
                res += tens[Math.floor(n / 10)];
                if (n % 10 > 0) {
                    res += ' ' + units[n % 10];
                }
            }
        }
        return res.trim();
    }

    const result = translate(Math.abs(Math.floor(num)));
    return (result + ' Taka Only').replace(/\s+/g, ' ').trim();
};

export default convertToWords;
