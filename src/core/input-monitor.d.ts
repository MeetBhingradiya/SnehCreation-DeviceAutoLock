export interface WindowsInputMonitor {
    startMonitoring(callback: (activityType: string) => void): void;
    stopMonitoring(): void;
    isActive(): boolean;
}

export declare class WindowsInputMonitor implements WindowsInputMonitor {
    constructor();
    startMonitoring(callback: (activityType: string) => void): void;
    stopMonitoring(): void;
    isActive(): boolean;
}
