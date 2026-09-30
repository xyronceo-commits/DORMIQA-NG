export class Messaging {}

export const isSupported = async (): Promise<boolean> => false;
export const getMessaging = (_app?: any): Messaging | null => null;
export const getToken = async (_messaging?: any, _options?: any): Promise<string | null> => null;
export const onMessage = (_messaging?: any, _callback?: any): (() => void) => () => {};
