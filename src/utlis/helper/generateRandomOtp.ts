export const generateRandomOtp = ()=>{
    return Math.floor(100000 + Math.random() * 900000);
}