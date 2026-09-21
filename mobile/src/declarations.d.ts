declare module 'react-native-immediate-phone-call' {
  const RNImmediatePhoneCall: {
    immediatePhoneCall: (phoneNumber: string) => void;
  };
  export default RNImmediatePhoneCall;
}

declare module 'react-native-direct-sms' {
  const DirectSms: {
    sendDirectSms: (phoneNumber: string, message: string) => Promise<void>;
  };
  export default DirectSms;
}