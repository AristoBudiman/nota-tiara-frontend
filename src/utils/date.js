export const getWIBDateString = (date = new Date()) => {
  // Intl.DateTimeFormat dengan locale 'en-CA' menghasilkan format YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(date);
};
