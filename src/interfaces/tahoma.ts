export interface TahomaAccount {
    username: string;
    password: string;
}

export interface TahomaSite {
    id: string,
    label: string
}

export interface TahomaDevice {
    id: string;
    type: string;
    parent_id: string;
    categories: string[];
    states: TahomaState[];
    capabilities: TahomaCapability[];
    site_id: string;
    name: string;
    available: boolean;
    version?: string;
}

export interface TahomaState {
    name: string;
    value: any;
    type: string;
}

export interface TahomaAction {
    name: string;
}

export interface TahomaCapability {
    name: string;
    parameters: TahomaCapabilityParam[];
}

export interface TahomaCapabilityParam {
    name: string;
    type: string;
}

export interface TahomaCommand {
    name: string;
    parameters?: TahomaCommandParam[];
}

export interface TahomaCommandParam {
    name: string;
    value: any;
}

export interface TahomaExecutionState {
    finished: boolean;
    account?: string;
    device?: string;
    expectedState?: object;
    jobId?: string;
    deviceState: TahomaDevice;
}

export interface TahomaExecutionResponse {
    job_id: string;
}