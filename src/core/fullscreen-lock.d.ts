export interface FullScreenLock {
    lock(masterPassword: string, userPassword: string): Promise<boolean>;
    unlock(): Promise<boolean>;
    setUnlockCallback(callback: () => void): void;
    isDeviceLocked(): boolean;
}

export declare class FullScreenLock implements FullScreenLock {
    constructor();
    lock(masterPassword: string, userPassword: string): Promise<boolean>;
    unlock(): Promise<boolean>;
    setUnlockCallback(callback: () => void): void;
    isDeviceLocked(): boolean;
}
